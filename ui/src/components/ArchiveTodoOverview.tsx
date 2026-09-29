'use client';

import { VoiceMemo } from '@/types/VoiceMemo';
import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface ArchiveTodoOverviewProps {
  memos: VoiceMemo[];
}

const parseTodos = (todos: string): { completed: number; total: number } => {
  if (!todos?.trim()) return { completed: 0, total: 0 };
  const lines = todos
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const isChecklist = (line: string) => /^\s*-\s*\[( |x|X)\]/.test(line);
  const isCheckmark = (line: string) => /^\s*✓\s+/.test(line);
  const relevant = lines.filter(line => isChecklist(line) || isCheckmark(line));
  const completed = relevant.filter(line => /^\s*-\s*\[(x|X)\]/.test(line) || isCheckmark(line)).length;
  const total = relevant.length;
  return { completed, total };
};

const TodoProgressBar = ({ todos }: { todos?: string }) => {
  if (!todos) return null;
  const { completed, total } = parseTodos(todos);
  if (total === 0) return null;
  const incompleteBorder = completed === 0 ? 'border-red-500' : 'border-orange-500';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-[2px] border ${
            i < completed ? 'bg-green-500 border-green-500' : incompleteBorder
          }`}
        />
      ))}
    </div>
  );
};

const formatMemoDate = (memo: VoiceMemo): string => {
  const date = typeof memo.createdAt === 'string' ? new Date(memo.createdAt) : memo.createdAt;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function ArchiveTodoOverview({ memos }: ArchiveTodoOverviewProps) {
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [showOnlyAllIncomplete, setShowOnlyAllIncomplete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter memos that have todos
  const memosWithTodos = useMemo(() => {
    return memos.filter(m => {
      const { total } = parseTodos(m.todos || '');
      return total > 0;
    });
  }, [memos]);

  const visibleMemos = useMemo(() => {
    if (showOnlyAllIncomplete) {
      return memosWithTodos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return total > 0 && completed === 0;
      });
    }
    if (showOnlyCompleted) {
      return memosWithTodos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return total > 0 && completed === total;
      });
    }
    if (hideCompleted) {
      return memosWithTodos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return !(total > 0 && completed === total);
      });
    }
    return memosWithTodos;
  }, [hideCompleted, showOnlyCompleted, showOnlyAllIncomplete, memosWithTodos]);

  // Sort by date (newest first)
  const sortedMemos = useMemo(() => {
    return [...visibleMemos].sort((a, b) => b.filename.localeCompare(a.filename));
  }, [visibleMemos]);

  if (memosWithTodos.length === 0) {
    return null;
  }

  const displayMemos = isExpanded ? sortedMemos : sortedMemos.slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex justify-end mb-1">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setShowOnlyAllIncomplete(v => {
                const next = !v;
                if (next) {
                  setHideCompleted(false);
                  setShowOnlyCompleted(false);
                }
                return next;
              });
            }}
            title={showOnlyAllIncomplete ? 'Showing only memos with all TODOs open' : 'Show only memos with all TODOs open'}
            className={`w-3 h-3 rounded-[2px] border transition-colors ${
              showOnlyAllIncomplete ? 'bg-red-500 border-red-500' : 'border-red-500'
            }`}
          />
          <button
            onClick={() => {
              setHideCompleted(v => {
                const next = !v;
                if (next) {
                  setShowOnlyCompleted(false);
                  setShowOnlyAllIncomplete(false);
                }
                return next;
              });
            }}
            title={hideCompleted ? 'Showing only memos with open TODOs' : 'Hide completed memos'}
            className={`w-3 h-3 rounded-[2px] border transition-colors ${
              hideCompleted ? 'bg-orange-500 border-orange-500' : 'border-orange-500'
            }`}
          />
          <button
            onClick={() => {
              setShowOnlyCompleted(v => {
                const next = !v;
                if (next) {
                  setHideCompleted(false);
                  setShowOnlyAllIncomplete(false);
                }
                return next;
              });
            }}
            title={showOnlyCompleted ? 'Showing only completed memos' : 'Show only completed memos'}
            className={`w-3 h-3 rounded-[2px] border transition-colors ${
              showOnlyCompleted ? 'bg-green-500 border-green-500' : 'border-green-500'
            }`}
          />
        </div>
      </div>
      <div className="space-y-1">
        {displayMemos.map(memo => (
          <div
            key={memo.path}
            className="flex items-center justify-between text-xs rounded px-2 py-1"
          >
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">
                {formatMemoDate(memo)}
              </span>
              <a
                href={`/memos/${memo.filename}${memo.archivePath ? `?archive=${memo.archivePath}` : ''}`}
                className="font-medium text-gray-900 dark:text-gray-100 truncate text-left hover:underline"
                title={memo.title || 'Untitled'}
              >
                {memo.title || 'Untitled'}
              </a>
              <a
                href={`/memos/${memo.filename}${memo.archivePath ? `?archive=${memo.archivePath}` : ''}`}
                className="ml-auto flex-shrink-0"
              >
                <TodoProgressBar todos={memo.todos} />
              </a>
            </div>
          </div>
        ))}
        {sortedMemos.length > 10 && (
          <div className="flex justify-center pt-1">
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              title={isExpanded ? 'Show less' : 'Show more'}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
        {visibleMemos.length === 0 && memosWithTodos.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            No matching TODOs
          </p>
        )}
      </div>
    </div>
  );
}

