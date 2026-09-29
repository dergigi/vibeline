'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { VoiceMemo } from '@/types/VoiceMemo';
import { VoiceMemoCard } from '@/components/VoiceMemoCard';
import { SearchProvider, useSearch } from '@/contexts/SearchContext';
import { SearchBar } from '@/components/SearchBar';
import { FilterButtons } from '@/components/FilterButtons';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMasksTheater } from '@fortawesome/free-solid-svg-icons';
import ArchiveTodoOverview from '@/components/ArchiveTodoOverview';
import { analyzeEmotions, MoodAnalysis } from '@/lib/moodUtils';

interface ApiVoiceMemo extends Omit<VoiceMemo, 'createdAt'> {
  createdAt: string;
}

interface ArchiveMonthResponse {
  memos: ApiVoiceMemo[];
  monthlySummary?: string;
}

interface MonthlyStats {
  memoCount: number;
  totalWords: number;
  totalDuration: number; // in seconds
  openTodos: number;
}

function formatMonthName(folderName: string): string {
  const [year, month] = folderName.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}


const MOOD_COLOR_CLASSES = {
  yellow: 'text-amber-600 dark:text-amber-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
} as const;

function MonthlySummaryCard({ summary, stats, mood }: { summary?: string; stats: MonthlyStats | null; mood: MoodAnalysis | null }) {
  // Skip the title line and get the content
  const content = summary 
    ? summary.split('\n').slice(1).join('\n').trim()
    : null;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-6">
      {stats && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {stats.memoCount} {stats.memoCount === 1 ? 'memo' : 'memos'}
          {stats.totalDuration > 0 && ` · ${formatTotalDuration(stats.totalDuration)} recording`}
          {stats.totalWords > 0 && ` · ${stats.totalWords.toLocaleString()} words`}
          {stats.openTodos > 0 && ` · ${stats.openTodos} open ${stats.openTodos === 1 ? 'todo' : 'todos'}`}
        </p>
      )}
      {content && (
        <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
          {content.replace(/\*\*/g, '').replace(/-{3,}/g, '')}
        </div>
      )}
      {mood && mood.topEmotions.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faMasksTheater} className="w-4 h-4" />
          {mood.topEmotions.map((e, i) => (
            <span key={e.emotion}>
              <span className={MOOD_COLOR_CLASSES[e.color]}>{e.emotion}</span>
              {i < mood.topEmotions.length - 1 && ', '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function countOpenTodos(todos: string): number {
  // Count unchecked todos: lines matching "- [ ]" pattern
  const matches = todos.match(/^\s*-\s*\[\s\]/gm);
  return matches ? matches.length : 0;
}

function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  return `${minutes}m`;
}

function ArchiveMemoList({ month, onSummaryLoaded, onStatsLoaded, onMemosLoaded }: { 
  month: string; 
  onSummaryLoaded: (summary: string | undefined) => void;
  onStatsLoaded: (stats: MonthlyStats) => void;
  onMemosLoaded: (memos: VoiceMemo[]) => void;
}) {
  const { setMemos, filteredMemos } = useSearch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMemos() {
      try {
        const response = await fetch(`/api/archive/${month}`);
        if (response.ok) {
          const data: ArchiveMonthResponse = await response.json();
          const memos = data.memos.map((memo) => ({
            ...memo,
            createdAt: new Date(memo.createdAt)
          }));
          setMemos(memos);
          onSummaryLoaded(data.monthlySummary);
          onMemosLoaded(memos);
          
          // Calculate stats
          const stats: MonthlyStats = {
            memoCount: memos.length,
            totalWords: memos.reduce((sum, memo) => sum + (memo.transcript ? countWords(memo.transcript) : 0), 0),
            totalDuration: memos.reduce((sum, memo) => sum + (memo.duration || 0), 0),
            openTodos: memos.reduce((sum, memo) => sum + (memo.todos ? countOpenTodos(memo.todos) : 0), 0),
          };
          onStatsLoaded(stats);
        }
      } catch (error) {
        console.error('Error fetching archive memos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMemos();
  }, [month, setMemos, onSummaryLoaded, onStatsLoaded, onMemosLoaded]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1">
        {filteredMemos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No voice memos found</p>
          </div>
        ) : (
          filteredMemos.map((memo) => (
            <VoiceMemoCard key={memo.filename} memo={memo} />
          ))
        )}
      </div>
    </div>
  );
}

function ArchiveMonthContent({ month }: { month: string }) {
  const [monthlySummary, setMonthlySummary] = useState<string | undefined>(undefined);
  const [prevMonth, setPrevMonth] = useState<string | null>(null);
  const [nextMonth, setNextMonth] = useState<string | null>(null);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [allMemos, setAllMemos] = useState<VoiceMemo[]>([]);
  const [moodAnalysis, setMoodAnalysis] = useState<MoodAnalysis | null>(null);

  // Compute mood analysis when memos change
  useEffect(() => {
    if (allMemos.length === 0) {
      setMoodAnalysis(null);
      return;
    }
    const combinedText = allMemos
      .map(memo => `${memo.transcript || ''} ${memo.summary || ''}`)
      .join(' ');
    setMoodAnalysis(analyzeEmotions(combinedText));
  }, [allMemos]);

  useEffect(() => {
    async function fetchArchiveFolders() {
      try {
        const response = await fetch('/api/archive');
        if (response.ok) {
          const folders: { name: string }[] = await response.json();
          // Folders are sorted newest first
          const currentIndex = folders.findIndex(f => f.name === month);
          // Next month (newer) is at a lower index
          if (currentIndex > 0) {
            setNextMonth(folders[currentIndex - 1].name);
          } else {
            setNextMonth(null);
          }
          // Previous month (older) is at a higher index
          if (currentIndex >= 0 && currentIndex < folders.length - 1) {
            setPrevMonth(folders[currentIndex + 1].name);
          } else {
            setPrevMonth(null);
          }
        }
      } catch (error) {
        console.error('Error fetching archive folders:', error);
      }
    }
    fetchArchiveFolders();
  }, [month]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          {prevMonth ? (
            <Link
              href={`/archive/${prevMonth}`}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              title={formatMonthName(prevMonth)}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">{prevMonth}</span>
            </Link>
          ) : (
            <div className="p-2 w-9" /> 
          )}
          <Link 
            href="/archive"
            className="flex-1 text-center"
            title="Back to archive"
          >
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
              {formatMonthName(month)}
            </h1>
          </Link>
          {nextMonth ? (
            <Link
              href={`/archive/${nextMonth}`}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
              title={formatMonthName(nextMonth)}
            >
              <span className="text-sm hidden sm:inline">{nextMonth}</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          ) : (
            <div className="p-2 w-9" />
          )}
        </div>

        {stats && <MonthlySummaryCard summary={monthlySummary} stats={stats} mood={moodAnalysis} />}

        <div className="flex items-center justify-end gap-4 mb-6">
          <FilterButtons />
          <div className="w-64">
            <SearchBar />
          </div>
        </div>

        <ArchiveTodoOverview memos={allMemos} />

        <ArchiveMemoList month={month} onSummaryLoaded={setMonthlySummary} onStatsLoaded={setStats} onMemosLoaded={setAllMemos} />
      </div>
    </main>
  );
}

export default function ArchiveMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = use(params);

  return (
    <SearchProvider isArchiveView>
      <ArchiveMonthContent month={month} />
    </SearchProvider>
  );
}

