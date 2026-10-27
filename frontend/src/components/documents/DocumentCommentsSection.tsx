'use client';

import React from 'react';
import { DocumentComment } from '@/types';
import { MessageSquare, Send } from 'lucide-react';

interface DocumentCommentsSectionProps {
  comments?: DocumentComment[];
  newComment: string;
  setNewComment: (val: string) => void;
  handleAddComment: (e: React.FormEvent) => void;
  submittingComment: boolean;
}

export const DocumentCommentsSection: React.FC<DocumentCommentsSectionProps> = ({
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  submittingComment,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 transition-colors duration-200">
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 shrink-0 text-primary-600 dark:text-primary-400" />
        <span>Ichki Munozara va Izohlar ({comments?.length || 0})</span>
      </h2>

      <div className="space-y-3 mb-4">
        {!comments || comments.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-2">Hozircha izohlar mavjud emas.</p>
        ) : (
          comments.map((comm) => (
            <div
              key={comm.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 mb-1">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{comm.user.fullName}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(comm.createdAt).toLocaleString('uz-UZ')}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comm.comment}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddComment} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Hujjat yuzasidan xizmat izohini qoldiring..."
          className="flex-1 min-w-0 px-4 py-2.5 sm:py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
        />
        <button
          type="submit"
          disabled={submittingComment || !newComment.trim()}
          aria-label="Yuborish"
          className="px-3.5 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Yuborish</span>
        </button>
      </form>
    </div>
  );
};
