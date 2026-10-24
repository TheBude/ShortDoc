'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
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
  Download,
} from 'lucide-react';
import { downloadDocumentDocx, isDocxAvailable, DOCX_LOCKED_HINT } from '@/lib/downloadDocx';
import { CreateDocumentModal } from '@/components/documents/CreateDocumentModal';
import { getCategoryMeta, ALL_CATEGORIES_LIST } from '@/lib/categories';

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { refreshCounts } = useRealtime();
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
  const [createdDocSuccess, setCreatedDocSuccess] = useState<Document | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);

  // New Document Form
  const [formData, setFormData] = useState({
    title: '',
    documentType: 'INTERNAL',
    category: 'Bildirgi',
    sender: user?.department?.name || user?.fullName || '',
    receiver: 'Universitet rektoriga',
    assigneeId: '',
    isPublic: false,
    departmentId: user?.departmentId || '',
    priority: 'MEDIUM',
    deadline: '',
    summary: '',
    approverIds: [] as string[],
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !formData.sender) {
      setFormData((prev) => ({
        ...prev,
        sender: user.department?.name || user.fullName || '',
        departmentId: user.departmentId || '',
      }));
    }
  }, [user]);

  const resetForm = () => {
    setFormData({
      title: '',
      documentType: 'INTERNAL',
      category: 'Bildirgi',
      sender: user?.department?.name || user?.fullName || '',
      receiver: 'Universitet rektoriga',
      assigneeId: '',
      isPublic: false,
      departmentId: user?.departmentId || '',
      priority: 'MEDIUM',
      deadline: '',
      summary: '',
      approverIds: [],
    });
    setFormError(null);
    setCreatedDocSuccess(null);
    setAttachedFiles([]);
    setUploadWarnings([]);
  };

  const urlDocType = searchParams.get('documentType') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlCategory = searchParams.get('category') || '';
  const urlPendingMySig = searchParams.get('pendingMySignature') === 'true';
  const urlCreate = searchParams.get('create') === 'true';

  // React to URL search params whenever sidebar links are clicked
  useEffect(() => {
    setDocType(urlDocType);
    setStatus(urlStatus);
    setCategory(urlCategory);
    setPendingMySignature(urlPendingMySig);
    setPage(1);

    // Determine human-readable title for active filter
    if (urlPendingMySig || urlStatus === 'IN_APPROVAL') {
      setActiveFilterName('Kelishuvda (Imzoga kelgan hujjatlar)');
    } else if (urlStatus === 'REGISTERED') {
      setActiveFilterName('Ro‘yxatga olish uchun kutilayotganlar');
    } else if (urlStatus === 'ARCHIVED') {
      setActiveFilterName('Elektron arxivdagi hujjatlar');
    } else if (urlCategory.toLowerCase().includes('buyruq')) {
      setActiveFilterName('Rektor buyruqlari va qarorlari');
    } else if (urlCategory.toLowerCase().includes('murojaat')) {
      setActiveFilterName('Fuqarolar va talabalar murojaatlari');
    } else if (urlDocType === 'INTERNAL') {
      setActiveFilterName('Ichki bildirgilar va xizmat xatlari');
    } else if (urlDocType === 'INCOMING') {
      setActiveFilterName('Kiruvchi rasmiy xatlar');
    } else if (urlDocType === 'OUTGOING') {
      setActiveFilterName('Chiquvchi xatlar');
    } else {
      setActiveFilterName('');
    }

    if (urlCreate) {
      setIsModalOpen(true);
    }
  }, [urlDocType, urlStatus, urlCategory, urlPendingMySig, urlCreate]);

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
      fetchApi<User[]>('/users?limit=100', {}, 60000),
      fetchApi<Department[]>('/departments', {}, 60000),
    ]);
    if (uRes.success && uRes.data) setUsersList(uRes.data);
    if (dRes.success && dRes.data) setDepartmentsList(dRes.data);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = {
      ...formData,
      departmentId: formData.departmentId?.trim() || null,
      assigneeId: formData.assigneeId?.trim() || null,
      deadline: formData.deadline?.trim() || null,
    };

    const res = await fetchApi<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      // Hujjat yaratilgach, tanlangan fayllar ketma-ket biriktiriladi; xato bo'lsa hujjat baribir saqlanadi
      const warnings: string[] = [];
      for (const file of attachedFiles) {
        const fd = new FormData();
        fd.append('documentId', res.data.id);
        fd.append('file', file);
        const up = await fetchApi('/document-files/upload', { method: 'POST', body: fd });
        if (!up.success) warnings.push(`${file.name}: ${up.message || 'yuklab bo‘lmadi'}`);
      }
      setUploadWarnings(warnings);
      setSubmitting(false);
      setCreatedDocSuccess(res.data);
      refreshCounts();
      loadDocuments();
    } else {
      setSubmitting(false);
      const errorMsg = res.errors && Array.isArray(res.errors) && res.errors.length > 0
        ? res.errors.map((err: any) => err.message).join('; ')
        : (res.message || 'Xatolik yuz berdi');
      setFormError(errorMsg);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'REGISTERED':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded font-medium">Ro‘yxatga olindi</span>;
      case 'IN_APPROVAL':
        return <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-850 text-xs px-2 py-0.5 rounded font-medium">Kelishuvda</span>;
      case 'IN_EXECUTION':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded font-medium">Ijroda</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850 text-xs px-2 py-0.5 rounded font-medium">Bajarildi</span>;
      case 'REJECTED':
        return <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-850 text-xs px-2 py-0.5 rounded font-medium">Rad etildi</span>;
      case 'ARCHIVED':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded font-medium">Arxivda</span>;
      default:
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded font-medium">{st}</span>;
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'URGENT':
        return <span className="text-rose-700 dark:text-rose-400 font-semibold text-xs">Shoshilinch</span>;
      case 'HIGH':
        return <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs">Yuqori</span>;
      default:
        return <span className="text-slate-500 dark:text-slate-400 text-xs">Oddiy</span>;
    }
  };

  const getCategoryBadge = (cat?: string | null) => {
    const meta = getCategoryMeta(cat);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${meta.badgeClass}`}>
        {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Hujjatlar Reyestri</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Barcha kiruvchi, chiquvchi va ichki xizmat xatlari ro‘yxati</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Hujjat Yaratish</span>
        </button>
      </div>

      {/* Active Filter Pill / Banner */}
      {activeFilterName && (
        <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-500 animate-pulse" />
            <span>Tanlangan bo‘lim: <strong className="font-bold text-slate-900 dark:text-white text-sm ml-1">{activeFilterName}</strong></span>
          </div>
          <button
            onClick={() => {
              setDocType('');
              setStatus('');
              setCategory('');
              setPendingMySignature(false);
              setActiveFilterName('');
              setSearch('');
              router.push('/documents');
            }}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline font-bold cursor-pointer transition-colors"
          >
            Filtrni tozalash
          </button>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
        {/* Document Type Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => { setDocType(''); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              docType === '' ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => { setDocType('INTERNAL'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              docType === 'INTERNAL' ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Ichki Bildirgilar
          </button>
          <button
            onClick={() => { setDocType('INCOMING'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              docType === 'INCOMING' ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Kiruvchi Xatlar
          </button>
          <button
            onClick={() => { setDocType('OUTGOING'); setPage(1); }}
            className={`pb-3 px-4 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              docType === 'OUTGOING' ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Chiquvchi Xatlar
          </button>
        </div>

        {/* Search and Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Barcha holatlar</option>
            <option value="REGISTERED">Ro‘yxatga olingan</option>
            <option value="IN_APPROVAL">Imzolanmoqda</option>
            <option value="IN_EXECUTION">Ijroda</option>
            <option value="COMPLETED">Bajarilgan</option>
            <option value="REJECTED">Qaytarilgan</option>
          </select>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Barcha turlar</option>
            {ALL_CATEGORIES_LIST.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Barcha muhimlik darajalari</option>
            <option value="LOW">Past</option>
            <option value="MEDIUM">O‘rta</option>
            <option value="HIGH">Yuqori</option>
            <option value="URGENT">Shoshilinch</option>
          </select>

          <button
            onClick={() => { setSearch(''); setDocType(''); setStatus(''); setPriority(''); setCategory(''); setPage(1); }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            Filtrni tozalash
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
            <p className="text-xs">Hujjatlar yuklanmoqda...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Hech qanday hujjat topilmadi</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Qidiruv parametrlarini o‘zgartirib ko‘ring yoki yangi hujjat yarating.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase font-semibold">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {doc.regNumber}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{doc.title}</div>
                        {doc.summary && <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{doc.summary}</div>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getCategoryBadge(doc.category)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{doc.department?.name || '—'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{doc.creator?.fullName || ''}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{getPriorityBadge(doc.priority)}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {doc.deadline ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {new Date(doc.deadline).toLocaleDateString('uz-UZ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => downloadDocumentDocx(doc.id, doc.regNumber, doc.category)}
                            disabled={!isDocxAvailable(doc.approvals)}
                            title={isDocxAvailable(doc.approvals) ? 'Word (.docx) yuklab olish' : DOCX_LOCKED_HINT}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>.docx</span>
                          </button>

                          <Link
                            href={`/documents/${doc.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ko‘rish</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Telefonda siqilib qolmaydigan qulay kartochkalar) */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-2 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {doc.regNumber}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getCategoryBadge(doc.category)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </div>

                  <h3 className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                    {doc.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>{doc.creator?.fullName || doc.sender || '—'}</span>
                    {doc.deadline && (
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.deadline).toLocaleDateString('uz-UZ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex-1 py-1.5 text-center text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      Ko‘rish
                    </Link>
                    <button
                      type="button"
                      onClick={() => downloadDocumentDocx(doc.id, doc.regNumber, doc.category)}
                      disabled={!isDocxAvailable(doc.approvals)}
                      title={isDocxAvailable(doc.approvals) ? undefined : DOCX_LOCKED_HINT}
                      className="px-3 py-1.5 text-xs font-semibold disabled:opacity-40 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.docx</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Sahifa {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Oldingi
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      <CreateDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        createdDocSuccess={createdDocSuccess}
        resetForm={resetForm}
        formError={formError}
        formData={formData}
        setFormData={setFormData}
        handleCreateDocument={handleCreateDocument}
        submitting={submitting}
        usersList={usersList}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        uploadWarnings={uploadWarnings}
        departmentsList={departmentsList}
        user={user}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 dark:text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2" />
          <p className="text-xs">Hujjatlar yuklanmoqda...</p>
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}
