'use client';

import React from 'react';
import Link from 'next/link';
import { Document, User } from '@/types';
import { downloadDocumentDocx } from '@/lib/downloadDocx';
import {
  CheckCircle2,
  Download,
  Eye,
  AlertCircle,
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
    summary: string;
    approverIds: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleCreateDocument: (e: React.FormEvent) => void;
  submitting: boolean;
  usersList: User[];
  user: User | null;
}

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
  user,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl my-auto p-5 sm:p-6 transition-colors duration-200">
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
                  {createdDocSuccess.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 max-w-md mx-auto">
                «{createdDocSuccess.title}»
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  downloadDocumentDocx(
                    createdDocSuccess.id,
                    createdDocSuccess.regNumber,
                    createdDocSuccess.category
                  )
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Word (.docx) yuklab olish</span>
              </button>

              <Link
                href={`/documents/${createdDocSuccess.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Ko‘rish</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
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
              {/* Step 1: Big category selector buttons */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Hujjat turini tanlang
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { cat: 'Bildirgi', to: 'Universitet rektoriga', type: 'INTERNAL' },
                    { cat: 'Xizmat xati', to: 'O‘quv boshqarmasiga', type: 'INTERNAL' },
                    { cat: 'Ariza', to: 'Fakultet dekanatiga', type: 'INTERNAL' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.cat}
                      onClick={() => setFormData({ ...formData, category: item.cat, receiver: item.to, documentType: item.type })}
                      className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                        formData.category === item.cat
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {item.cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Hujjat sarlavhasi (Nomi) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: AI laboratoriyasini tashkil qilish to‘g‘risida"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Sender & Receiver (Auto-filled) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kimdan (Avtomatik to‘ldirilgan)
                  </label>
                  <input
                    type="text"
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                    placeholder="Kafedra / Mas’ul..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kimga (Qabul qiluvchi)
                  </label>
                  <input
                    type="text"
                    value={formData.receiver}
                    onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                    placeholder="Universitet rektoriga..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Qisqacha mazmuni
                </label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Hujjat mohiyati..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Step 3: Approvers */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. Kimlar tasdiqlashi (imzolashi) kerak?
                </label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-800/60">
                  {usersList
                    .filter((u) => u.id !== user?.id && u.role !== 'SUPER_ADMIN')
                    .map((u) => {
                      const isChecked = formData.approverIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, approverIds: [...formData.approverIds, u.id] });
                              } else {
                                setFormData({
                                  ...formData,
                                  approverIds: formData.approverIds.filter((id) => id !== u.id),
                                });
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{u.fullName}</span>
                          <span className="text-slate-500 text-[11px]">({u.position})</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Yaratilmoqda...' : 'Hujjatni yuborish'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
