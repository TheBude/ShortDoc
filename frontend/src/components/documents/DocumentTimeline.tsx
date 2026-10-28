import React from 'react';
import {
  History,
  FilePlus2,
  Paperclip,
  PenLine,
  XCircle,
  MessageSquare,
  ListTodo,
  CheckCircle2,
  ArrowRightLeft,
  Hourglass,
} from 'lucide-react';
import { Document } from '@/types';
import { getDocumentStatusLabel } from '@/lib/labels';

type Tone = 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';

interface TimelineEvent {
  key: string;
  at: string;
  icon: React.ElementType;
  tone: Tone;
  content: React.ReactNode;
  note?: string;
}

const TONES: Record<Tone, string> = {
  blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

const Name = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold text-slate-800 dark:text-slate-200">{children}</span>
);
const Strong = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold text-slate-700 dark:text-slate-300">{children}</span>
);

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatTime = (iso: string) => new Date(iso).toLocaleString('uz-UZ');

/** Hujjat bo‘yicha barcha harakatlar: yaratilishi, fayllar, imzolar, izohlar, topshiriqlar, holat o‘zgarishlari. */
export const DocumentTimeline = ({ document }: { document: Document }) => {
  const events: TimelineEvent[] = [];

  events.push({
    key: 'created',
    at: document.createdAt,
    icon: FilePlus2,
    tone: 'blue',
    content: (
      <>
        <Name>{document.creator?.fullName || 'Tizim'}</Name> hujjatni yaratdi
      </>
    ),
  });

  document.files?.forEach((f) =>
    events.push({
      key: `file-${f.id}`,
      at: f.createdAt,
      icon: Paperclip,
      tone: 'slate',
      content: (
        <>
          <Name>{f.uploadedBy?.fullName || 'Foydalanuvchi'}</Name> fayl biriktirdi: <Strong>{f.originalName}</Strong>{' '}
          <span className="text-slate-400 dark:text-slate-500">({formatSize(f.fileSize)})</span>
        </>
      ),
    })
  );

  document.approvals?.forEach((a) => {
    if (a.status === 'APPROVED') {
      events.push({
        key: `approval-${a.id}`,
        at: a.signedAt || a.createdAt,
        icon: PenLine,
        tone: 'emerald',
        content: (
          <>
            <Name>{a.approver.fullName}</Name> hujjatni {a.role === 'SIGNER' ? 'imzoladi' : 'kelishdi'}{' '}
            <span className="text-slate-400 dark:text-slate-500">({a.stepOrder}-bosqich)</span>
          </>
        ),
        note: a.comments ? `Izoh: ${a.comments}` : undefined,
      });
    } else if (a.status === 'REJECTED') {
      events.push({
        key: `approval-${a.id}`,
        at: a.signedAt || a.createdAt,
        icon: XCircle,
        tone: 'rose',
        content: (
          <>
            <Name>{a.approver.fullName}</Name> hujjatni rad etdi{' '}
            <span className="text-slate-400 dark:text-slate-500">({a.stepOrder}-bosqich)</span>
          </>
        ),
        note: a.comments ? `Sabab: ${a.comments}` : undefined,
      });
    }
  });

  document.comments?.forEach((c) =>
    events.push({
      key: `comment-${c.id}`,
      at: c.createdAt,
      icon: MessageSquare,
      tone: 'blue',
      content: (
        <>
          <Name>{c.user.fullName}</Name> izoh qoldirdi
        </>
      ),
      note: c.comment,
    })
  );

  document.tasks?.forEach((t) => {
    events.push({
      key: `task-${t.id}`,
      at: t.createdAt,
      icon: ListTodo,
      tone: 'amber',
      content: (
        <>
          <Name>{t.createdBy?.fullName || 'Foydalanuvchi'}</Name> topshiriq berdi: <Strong>{t.title}</Strong>
          {t.assignedTo && (
            <>
              {' '}
              — <Name>{t.assignedTo.fullName}</Name>
            </>
          )}
        </>
      ),
    });
    if (t.completedAt) {
      events.push({
        key: `task-done-${t.id}`,
        at: t.completedAt,
        icon: CheckCircle2,
        tone: 'emerald',
        content: (
          <>
            <Name>{t.assignedTo?.fullName || 'Ijrochi'}</Name> topshiriqni bajardi: <Strong>{t.title}</Strong>
          </>
        ),
        note: t.resultComment ? `Natija: ${t.resultComment}` : undefined,
      });
    }
  });

  document.statusHistory?.forEach((h) =>
    events.push({
      key: `status-${h.id}`,
      at: h.createdAt,
      icon: ArrowRightLeft,
      tone: 'blue',
      content: (
        <>
          <Name>{h.changedBy.fullName}</Name> holatni <Strong>{getDocumentStatusLabel(h.oldStatus)}</Strong> dan{' '}
          <span className="font-bold text-primary-700 dark:text-primary-400">
            {getDocumentStatusLabel(h.newStatus)}
          </span>{' '}
          ga o‘zgartirdi
        </>
      ),
      note: h.reason ? `Sabab: ${h.reason}` : undefined,
    })
  );

  // Yangisi tepada
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const pending = (document.approvals || []).filter((a) => a.status === 'PENDING');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors duration-200">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <span>Hujjat tarixi</span>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">({events.length})</span>
      </h2>

      {pending.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          {pending.map((a) => (
            <div key={a.id} className="flex items-start gap-2">
              <Hourglass className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                {a.role === 'SIGNER' ? 'Imzo' : 'Kelishuv'} kutilmoqda: <strong>{a.approver.fullName}</strong> ({a.stepOrder}-bosqich)
              </span>
            </div>
          ))}
        </div>
      )}

      <ol className="space-y-1">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <li
              key={ev.key}
              className="text-xs flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${TONES[ev.tone]}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-500 dark:text-slate-400 leading-relaxed break-words">{ev.content}</div>
                {ev.note && (
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 break-words whitespace-pre-wrap">
                    {ev.note}
                  </div>
                )}
                <div className="sm:hidden text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatTime(ev.at)}</div>
              </div>
              <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 shrink-0 pt-1">
                {formatTime(ev.at)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
