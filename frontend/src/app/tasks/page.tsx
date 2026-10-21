'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { Task, Document, User } from '@/types';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User as UserIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal for new task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentsList, setDocumentsList] = useState<Document[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newTaskData, setNewTaskData] = useState({
    documentId: '',
    title: '',
    description: '',
    assignedToId: '',
    deadline: '',
  });

  // Modal for submitting task result
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [resultComment, setResultComment] = useState('');
  const [submittingResult, setSubmittingResult] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  useEffect(() => {
    loadAuxData();
  }, []);

  const loadTasks = async (forceInitial = false) => {
    if (forceInitial || tasks.length === 0) {
      setLoading(true);
    }
    const query = new URLSearchParams();
    if (statusFilter) query.append('status', statusFilter);
    const res = await fetchApi<Task[]>(`/tasks?${query.toString()}`);
    if (res.success && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  const loadAuxData = async () => {
    const [dRes, uRes] = await Promise.all([
      fetchApi('/documents?limit=50', {}, 30000),
      fetchApi('/users', {}, 60000),
    ]);
    if (dRes.success && dRes.data) setDocumentsList(dRes.data);
    if (uRes.success && uRes.data) setUsersList(uRes.data);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const res = await fetchApi('/tasks', {
      method: 'POST',
      body: JSON.stringify(newTaskData),
    });

    setSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setNewTaskData({
        documentId: '',
        title: '',
        description: '',
        assignedToId: '',
        deadline: '',
      });
      loadTasks(false);
    } else {
      setFormError(res.message || 'Xatolik yuz berdi');
    }
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !resultComment.trim()) return;

    setSubmittingResult(true);
    const res = await fetchApi(`/tasks/${selectedTask.id}/submit-result`, {
      method: 'POST',
      body: JSON.stringify({ resultComment }),
    });
    setSubmittingResult(false);

    if (res.success) {
      setSelectedTask(null);
      setResultComment('');
      loadTasks(false);
    } else {
      alert(res.message || 'Xatolik yuz berdi');
    }
  };

  const handleUpdateStatus = async (taskId: string, status: string) => {
    // Optimistic UI update! Update the status immediately in local state
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: status as any } : t))
    );

    const res = await fetchApi(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res.success) {
      loadTasks(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PENDING':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">Kutilmoqda</span>;
      case 'IN_PROGRESS':
        return <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Jarayonda</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Bajarildi</span>;
      case 'OVERDUE':
        return <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Muddati o‘tgan</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Topshiriqlar va Ijro Nazorati</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hujjatlar yuzasidan yuklatilgan vazifalar ijrosi monitoringi</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Topshiriq Biriktirish</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-2 text-xs font-semibold transition-colors duration-200">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === '' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Barchasi
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'PENDING' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Kutilmoqda
        </button>
        <button
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'IN_PROGRESS' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Ijroda (Jarayonda)
        </button>
        <button
          onClick={() => setStatusFilter('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'COMPLETED' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Bajarilgan
        </button>
      </div>

      {/* Task List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Topshiriqlar yuklanmoqda...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <CheckSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Topshiriqlar mavjud emas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Tegishli Hujjat</th>
                  <th className="py-3 px-4">Topshiriq sarlavhasi</th>
                  <th className="py-3 px-4">Mas’ul Ijrochi</th>
                  <th className="py-3 px-4">Ijro muddati</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {tasks.map((task) => {
                  const isOverdue =
                    task.deadline &&
                    new Date(task.deadline) < new Date() &&
                    task.status !== 'COMPLETED';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          href={`/documents/${task.documentId}`}
                          className="font-mono font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{task.document?.regNumber || 'Hujjat'}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">{task.title}</div>
                        {task.description && <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{task.description}</div>}
                        {task.resultComment && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-1.5 rounded mt-1">
                            Natija: {task.resultComment}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{task.assignedTo?.fullName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{task.assignedTo?.position}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {task.deadline ? (
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.deadline).toLocaleDateString('uz-UZ')}
                            {isOverdue && <span className="text-[10px] text-rose-500 dark:text-rose-400">(Muddati o‘tdi)</span>}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(task.status)}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        {task.status !== 'COMPLETED' && (
                          <>
                            {task.status === 'PENDING' && (
                              <button
                                onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                                className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-medium text-[11px] cursor-pointer"
                              >
                                Boshlash
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedTask(task)}
                              className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-medium text-[11px] cursor-pointer"
                            >
                              Natija topshirish
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 transition-colors duration-200">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Yangi Topshiriq Biriktirish</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Hujjat asosida mas’ul ijrochiga topshiriq bering</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tegishli Hujjat *</label>
                <select
                  required
                  value={newTaskData.documentId}
                  onChange={(e) => setNewTaskData({ ...newTaskData, documentId: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                >
                  <option value="">Hujjatni tanlang...</option>
                  {documentsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.regNumber} — {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Topshiriq nomi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: 3 kun muddatda taklif tayyorlash"
                  value={newTaskData.title}
                  onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Mas’ul ijrochi xodim *</label>
                <select
                  required
                  value={newTaskData.assignedToId}
                  onChange={(e) => setNewTaskData({ ...newTaskData, assignedToId: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                >
                  <option value="">Ijrochini tanlang...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ijro muddati (Dedlayn)</label>
                <input
                  type="date"
                  value={newTaskData.deadline}
                  onChange={(e) => setNewTaskData({ ...newTaskData, deadline: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Topshiriq tavsifi</label>
                <textarea
                  rows={3}
                  placeholder="Vazifa bo‘yicha aniq ko‘rsatmalar..."
                  value={newTaskData.description}
                  onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Topshiriqni Biriktirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Result Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 transition-colors duration-200">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Topshiriq Natijasini Topshirish</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedTask.title}</p>

            <form onSubmit={handleSubmitResult} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bajarilgan ish bo‘yicha xulosa (natija) *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Vazifa qanday bajarilgani haqida qisqacha ma’lumot..."
                  value={resultComment}
                  onChange={(e) => setResultComment(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingResult}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {submittingResult ? 'Yuborilmoqda...' : 'Bajarildi deb belgilash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
