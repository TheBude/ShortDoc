'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchApi } from '@/lib/api';
import { Document, User, Department } from '@/types';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
} from 'lucide-react';

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [pendingMySignature, setPendingMySignature] = useState<boolean>(false);
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal for new document
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);

  // New Document Form
  const [formData, setFormData] = useState({
    title: '',
    documentType: 'INTERNAL',
    category: 'Bildirgi',
    sender: '',
    receiver: '',
    departmentId: '',
    priority: 'MEDIUM',
    deadline: '',
    summary: '',
    approverIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Sync URL search params with state
  useEffect(() => {
    const handleLocationParams = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const dt = params.get('documentType') || '';
      const st = params.get('status') || '';
      const cat = params.get('category') || '';
      const pms = params.get('pendingMySignature') === 'true';
      const cr = params.get('create') === 'true';

      setDocType(dt);
      setStatus(st);
      setCategory(cat);
      setPendingMySignature(pms);

      // Determine human-readable title for active filter
      if (pms || st === 'IN_APPROVAL') {
        setActiveFilterName('Kelishuvda (Imzoga kelgan hujjatlar)');
      } else if (st === 'REGISTERED') {
        setActiveFilterName('Ro‘yxatga olish uchun kutilayotganlar');
      } else if (st === 'ARCHIVED') {
        setActiveFilterName('Elektron arxivdagi hujjatlar');
      } else if (cat.toLowerCase().includes('buyruq')) {
        setActiveFilterName('Rektor buyruqlari va qarorlari');
      } else if (cat.toLowerCase().includes('murojaat')) {
        setActiveFilterName('Fuqarolar va talabalar murojaatlari');
      } else if (dt === 'INTERNAL') {
        setActiveFilterName('Ichki bildirgilar va xizmat xatlari');
      } else if (dt === 'INCOMING') {
        setActiveFilterName('Kiruvchi rasmiy xatlar');
      } else if (dt === 'OUTGOING') {
        setActiveFilterName('Chiquvchi xatlar');
      } else {
        setActiveFilterName('');
      }

      if (cr) {
        setIsModalOpen(true);
      }
    };

    handleLocationParams();
    window.addEventListener('popstate', handleLocationParams);
    return () => window.removeEventListener('popstate', handleLocationParams);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDocuments();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, docType, status, priority, category, pendingMySignature, page]);

  useEffect(() => {
    loadAuxData();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDocuments = async (forceInitial = false) => {
    if (forceInitial || documents.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const query = new URLSearchParams();
    if (search) query.append('search', search);
    if (docType) query.append('documentType', docType);
    if (status) query.append('status', status);
    if (priority) query.append('priority', priority);
    if (category) query.append('category', category);
    if (pendingMySignature) query.append('pendingMySignature', 'true');
    query.append('page', page.toString());
    query.append('limit', '10');

    const res = await fetchApi(`/documents?${query.toString()}`);
    if (res.success && res.data) {
      setDocuments(res.data);
      if (res.meta) {
        setTotalPages(res.meta.totalPages || 1);
      }
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  const loadAuxData = async () => {
    const [uRes, dRes] = await Promise.all([
      fetchApi<User[]>('/users', {}, 60000),
      fetchApi<Department[]>('/departments', {}, 60000),
    ]);
    if (uRes.success && uRes.data) setUsersList(uRes.data);
    if (dRes.success && dRes.data) setDepartmentsList(dRes.data);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const res = await fetchApi('/documents', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    setSubmitting(false);

    if (res.success) {
      setIsModalOpen(false);
      setFormData({
        title: '',
        documentType: 'INTERNAL',
        category: 'Bildirgi',
        sender: '',
        receiver: '',
        departmentId: '',
        priority: 'MEDIUM',
        deadline: '',
        summary: '',
        approverIds: [],
      });
      loadDocuments();
    } else {
      setFormError(res.message || 'Xatolik yuz berdi');
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REGISTERED':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Ro‘yxatga olindi</span>;
      case 'IN_APPROVAL':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Kelishuvda (Imzo)</span>;
      case 'IN_EXECUTION':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Ijroda</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Bajarildi</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Rad etildi</span>;
      default:
        return <span className="bg-slate-50 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-medium">{st}</span>;
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'URGENT':
        return <span className="text-rose-600 font-bold text-xs">Shoshilinch</span>;
      case 'HIGH':
        return <span className="text-amber-600 font-semibold text-xs">Yuqori</span>;
      default:
        return <span className="text-slate-500 text-xs">Oddiy</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hujjatlar Reyestri</h1>
          <p className="text-xs text-slate-500 mt-1">Barcha kiruvchi, chiquvchi va ichki xizmat xatlari ro‘yxati</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Hujjat Yaratish</span>
        </button>
      </div>

      {/* Active Filter Pill / Banner */}
      {activeFilterName && (
        <div className="flex items-center justify-between p-3.5 bg-primary-50 border border-primary-200 rounded-xl text-xs text-primary-900 font-medium shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
            <span>Tanlangan bo‘lim: <strong className="font-bold text-primary-950 text-sm ml-1">{activeFilterName}</strong></span>
          </div>
          <button
            onClick={() => {
              setDocType('');
              setStatus('');
              setCategory('');
              setPendingMySignature(false);
              setActiveFilterName('');
              setSearch('');
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/documents');
              }
            }}
            className="text-primary-700 hover:text-primary-900 underline font-bold cursor-pointer"
          >
            Filtrni tozalash
          </button>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Document Type Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => { setDocType(''); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              docType === '' ? 'border-primary-600 text-primary-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => { setDocType('INTERNAL'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              docType === 'INTERNAL' ? 'border-primary-600 text-primary-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Ichki Bildirgilar
          </button>
          <button
            onClick={() => { setDocType('INCOMING'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              docType === 'INCOMING' ? 'border-primary-600 text-primary-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Kiruvchi Xatlar
          </button>
          <button
            onClick={() => { setDocType('OUTGOING'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
              docType === 'OUTGOING' ? 'border-primary-600 text-primary-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Chiquvchi Xatlar
          </button>
        </div>

        {/* Search and Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Raqami yoki nomi bo‘yicha izlash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
          >
            <option value="">Barcha holatlar</option>
            <option value="REGISTERED">Ro‘yxatga olingan</option>
            <option value="IN_APPROVAL">Kelishuvda (Imzo)</option>
            <option value="IN_EXECUTION">Ijroda</option>
            <option value="COMPLETED">Bajarilgan</option>
            <option value="REJECTED">Rad etilgan</option>
          </select>

          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
          >
            <option value="">Barcha muhimlik darajalari</option>
            <option value="LOW">Past</option>
            <option value="MEDIUM">O‘rta</option>
            <option value="HIGH">Yuqori</option>
            <option value="URGENT">Shoshilinch</option>
          </select>

          <button
            onClick={() => { setSearch(''); setDocType(''); setStatus(''); setPriority(''); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Filtrni tozalash
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Hujjatlar yuklanmoqda...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Hech qanday hujjat topilmadi</p>
            <p className="text-xs text-slate-400 mt-1">Qidiruv parametrlarini o‘zgartirib ko‘ring yoki yangi hujjat yarating.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Ro‘yxat №</th>
                  <th className="py-3 px-4">Hujjat nomi va mazmuni</th>
                  <th className="py-3 px-4">Turi</th>
                  <th className="py-3 px-4">Bo‘lim / Mas’ul</th>
                  <th className="py-3 px-4">Muhimlik</th>
                  <th className="py-3 px-4">Holati</th>
                  <th className="py-3 px-4">Ijro muddati</th>
                  <th className="py-3 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-primary-700 whitespace-nowrap">
                      {doc.regNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{doc.title}</div>
                      {doc.summary && <div className="text-[11px] text-slate-400 truncate">{doc.summary}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-600">{doc.category}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{doc.department?.name || '—'}</div>
                      <div className="text-[10px] text-slate-400">{doc.creator?.fullName || ''}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getPriorityBadge(doc.priority)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {doc.deadline ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(doc.deadline).toLocaleDateString('uz-UZ')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-700 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ko‘rish</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Sahifa {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Oldingi
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Yangi Hujjat Ro‘yxatga Olish</h2>
            <p className="text-xs text-slate-500 mb-4">Hujjat ma’lumotlarini kiriting va imzo qo‘yuvchi mas’ullarni belgilang</p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hujjat sarlavhasi (Nomi) *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Yangi kompyuter sinfini jihozlash bo‘yicha bildirgi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hujjat turi</label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  >
                    <option value="INTERNAL">Ichki xizmat xati / Bildirgi</option>
                    <option value="INCOMING">Kiruvchi rasmiy xat</option>
                    <option value="OUTGOING">Chiquvchi xat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategoriya</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Bildirgi, Ariza, Farmoyish..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kimdan (Jo‘natuvchi)</label>
                  <input
                    type="text"
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                    placeholder="Kafedra mudiri / Tashkilot..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kimga (Qabul qiluvchi)</label>
                  <input
                    type="text"
                    value={formData.receiver}
                    onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                    placeholder="Universitet Rektoriga..."
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Muhimlik darajasi</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  >
                    <option value="LOW">Past</option>
                    <option value="MEDIUM">O‘rta</option>
                    <option value="HIGH">Yuqori</option>
                    <option value="URGENT">Shoshilinch</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bajarish muddati (Dedlayn)</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hujjatning qisqacha mazmuni</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Hujjatning asosiy mohiyati va maqsadi..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                />
              </div>

              {/* Approvers / Imzo yig'ish zanjiri */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Imzo qo‘yuvchi mas’ullar (Kelishuv zanjiri)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">Hujjat kimlar tomonidan tasdiqlanishi (imzolanishi) kerak?</p>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {usersList
                    .filter((u) => u.id !== user?.id)
                    .map((u) => {
                      const isChecked = formData.approverIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer"
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
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="font-medium text-slate-800">{u.fullName}</span>
                          <span className="text-[10px] text-slate-400">({u.position})</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Hujjatni Ro‘yxatga Olish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
