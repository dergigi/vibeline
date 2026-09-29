'use client';

import { VoiceMemo } from '@/types/VoiceMemo';
import { useSearch } from '@/contexts/SearchContext';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { Flower, Waypoints } from 'lucide-react';

interface DashboardProps {
  memos: VoiceMemo[];
}

interface GroupedMemos {
  today: VoiceMemo[];
  yesterday: VoiceMemo[];
  twoDaysAgo: VoiceMemo[];
  restOfWeek: VoiceMemo[];
  restOfMonth: VoiceMemo[];
}

const parseTodos = (todos: string): { completed: number; total: number } => {
  if (!todos?.trim()) return { completed: 0, total: 0 };
  const lines = todos
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  // Consider only actual checklist items or checkmark-style lines
  const isChecklist = (line: string) => /^\s*-\s*\[( |x|X)\]/.test(line);
  const isCheckmark = (line: string) => /^\s*✓\s+/.test(line);
  const relevant = lines.filter(line => isChecklist(line) || isCheckmark(line));
  const completed = relevant.filter(line => /^\s*-\s*\[(x|X)\]/.test(line) || isCheckmark(line)).length;
  const total = relevant.length;
  return { completed, total };
};

// Helpers kept tiny and reusable (use LOCAL time to avoid UTC off-by-one)
const toYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};
const asDate = (value: string | Date): Date => (typeof value === 'string' ? new Date(value) : value);
const getMemoYmd = (memo: VoiceMemo): string => toYmd(asDate(memo.createdAt));
const getMemoTime = (memo: VoiceMemo): string =>
  asDate(memo.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

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

const groupMemosByTime = (memos: VoiceMemo[]): GroupedMemos => {
  // Boundaries, same style as TODOs plugin
  const now = new Date();
  const today = toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const yesterday = toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const twoDaysAgo = toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2));
  const threeDaysAgo = toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3));
  const eightDaysAgo = toYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8));

  const grouped: GroupedMemos = {
    today: [],
    yesterday: [],
    twoDaysAgo: [],
    restOfWeek: [],
    restOfMonth: []
  };
  
  // Deduplicate by file path to avoid duplicate keys/entries
  const uniqueMemosByPath = new Map<string, VoiceMemo>();
  memos.forEach(m => {
    if (!uniqueMemosByPath.has(m.path)) uniqueMemosByPath.set(m.path, m);
  });
  const uniqueMemos = Array.from(uniqueMemosByPath.values());

  uniqueMemos.forEach(memo => {
    const memoDateStr = getMemoYmd(memo);
    if (memoDateStr === today) {
      grouped.today.push(memo);
    } else if (memoDateStr === yesterday) {
      grouped.yesterday.push(memo);
    } else if (memoDateStr === twoDaysAgo) {
      grouped.twoDaysAgo.push(memo);
    } else if (memoDateStr < yesterday && memoDateStr >= threeDaysAgo) {
      grouped.restOfWeek.push(memo);
    } else if (memoDateStr < threeDaysAgo && memoDateStr >= eightDaysAgo) {
      grouped.restOfMonth.push(memo);
    }
  });

  // Sort groups to match main page (newest first by filename)
  const compareMemos = (a: VoiceMemo, b: VoiceMemo) => b.filename.localeCompare(a.filename);
  grouped.today.sort(compareMemos);
  grouped.yesterday.sort(compareMemos);
  grouped.twoDaysAgo.sort(compareMemos);
  grouped.restOfWeek.sort(compareMemos);
  grouped.restOfMonth.sort(compareMemos);
  
  return grouped;
};

// Opacity per group (fade: newest 100% → older more transparent)
const groupOpacity: Record<keyof GroupedMemos, string> = {
  today: 'opacity-100',
  yesterday: 'opacity-90',
  twoDaysAgo: 'opacity-80',
  restOfWeek: 'opacity-50',
  restOfMonth: 'opacity-25',
};


const groupIndicator: Record<keyof GroupedMemos, { letter: string; label: string }> = {
  today: { letter: 'T', label: 'Today' },
  yesterday: { letter: 'Y', label: 'Yesterday' },
  twoDaysAgo: { letter: 'A', label: 'Antepenultimate (2 days ago)' },
  restOfWeek: { letter: 'W', label: 'Rest of week (3-7 days ago)' },
  restOfMonth: { letter: 'M', label: 'Rest of month (8-31 days ago)' },
};

// Function to determine which icons to show for a memo (using same logic as SearchContext)
const getMemoIcons = (memo: VoiceMemo) => {
  const hasPrompts = (memo.prompts?.trim().length ?? 0) > 0;
  const hasDrafts = (memo.drafts?.trim().length ?? 0) > 0;
  const hasBlossom = memo.blossom && memo.blossom.url && memo.blossom.url.trim();
  const hasYoloPost = memo.yolopost && memo.yolopost.id && memo.yolopost.id.trim();

  const icons = [];
  if (hasYoloPost) icons.push(<Waypoints key="yolopost" className="w-3 h-3" />);
  if (hasBlossom) icons.push(<Flower key="blossom" className="w-3 h-3" />);
  if (hasDrafts) icons.push(<PencilIcon key="drafts" className="w-3 h-3" />);
  if (hasPrompts) icons.push(<SparklesIcon key="prompts" className="w-3 h-3" />);
  
  return icons;
};

export default function Dashboard({ memos }: DashboardProps) {
  const { filteredMemos } = useSearch();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [hideCompleted, setHideCompleted] = useState(false);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [showOnlyAllIncomplete, setShowOnlyAllIncomplete] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const sourceMemos = filteredMemos && filteredMemos.length > 0 ? filteredMemos : memos;
  const visibleMemos = useMemo(() => {
    if (showOnlyAllIncomplete) {
      return sourceMemos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return total > 0 && completed === 0;
      });
    }
    if (showOnlyCompleted) {
      return sourceMemos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return total > 0 && completed === total;
      });
    }
    if (hideCompleted) {
      return sourceMemos.filter(m => {
        const { completed, total } = parseTodos(m.todos || '');
        return !(total > 0 && completed === total);
      });
    }
    return sourceMemos;
  }, [hideCompleted, showOnlyCompleted, showOnlyAllIncomplete, sourceMemos]);
  // Local dates and times must wait until hydration so server and browser
  // time zones (or a midnight rollover) cannot produce different markup.
  const groupedMemos = isMounted ? groupMemosByTime(visibleMemos) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-8">
      <div className="flex justify-end mb-1 gap-1">
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
          aria-label="Toggle show only memos with all TODOs open"
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
          aria-label="Toggle hide completed memos"
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
          aria-label="Toggle show only completed memos"
          className={`w-3 h-3 rounded-[2px] border transition-colors ${
            showOnlyCompleted ? 'bg-green-500 border-green-500' : 'border-green-500'
          }`}
        />
      </div>
      <div className="space-y-1">
        {(() => {
          if (!groupedMemos) {
            return <p role="status" className="text-xs text-gray-500 dark:text-gray-400">Loading dashboard...</p>;
          }

          const groups = ([
            ['today', groupedMemos.today],
            ['yesterday', groupedMemos.yesterday],
            ['twoDaysAgo', groupedMemos.twoDaysAgo],
            ['restOfWeek', groupedMemos.restOfWeek],
            ['restOfMonth', groupedMemos.restOfMonth],
          ] as const) as ReadonlyArray<[keyof GroupedMemos, VoiceMemo[]]>;
          const flat = groups.flatMap(([group, list]) => list.map(memo => ({ group, memo })));
          const visible = isExpanded ? flat : flat.slice(0, 12);
          return (
            <>
              {visible.map(({ group, memo }) => (
                <div
                  key={memo.path}
                  className="flex items-center justify-between text-xs rounded px-2 py-1"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] w-3 inline-flex items-center justify-center text-gray-400 dark:text-gray-500"
                        title={groupIndicator[group].label}
                        aria-label={groupIndicator[group].label}
                      >
                        {groupIndicator[group].letter}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {getMemoTime(memo)}
                      </span>
                    </div>
                    <a
                      href={`/memos/${memo.filename}${memo.archivePath ? `?archive=${memo.archivePath}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-medium text-gray-900 dark:text-gray-100 truncate text-left hover:underline ${groupOpacity[group]}`}
                      title="Open memo in new tab"
                    >
                      {memo.title || 'Untitled'}
                    </a>
                    {getMemoIcons(memo).length > 0 && (
                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 flex items-center gap-0.5">
                        {getMemoIcons(memo)}
                      </span>
                    )}
                    <a
                      href={`/memos/${memo.filename}${memo.archivePath ? `?archive=${memo.archivePath}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto"
                      title="Open memo in new tab"
                    >
                      <TodoProgressBar todos={memo.todos} />
                    </a>
                  </div>
                </div>
              ))}
              {flat.length > 12 && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => setIsExpanded(v => !v)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    title={isExpanded ? 'Show less' : 'Show more'}
                    aria-label={isExpanded ? 'Show less' : 'Show more'}
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
