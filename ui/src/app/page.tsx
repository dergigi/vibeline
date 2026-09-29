import { Suspense } from 'react';
import Dashboard from '@/components/Dashboard';
import MoodSummary from '@/components/MoodSummary';
import { SearchProvider } from '@/contexts/SearchContext';
import { SearchBar } from '@/components/SearchBar';
import { MemoList } from '@/components/MemoList';
import { FilterButtons } from '@/components/FilterButtons';
import { PluginLinks } from '@/components/PluginLinks';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Voice Memos',
  description: 'Call 555-vibe to vibe it into existence 🤙',
};

async function getData() {
  const port = process.env.PORT || '555';
  const response = await fetch(new URL('/api/memos', typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : `http://localhost:${port}`), { cache: 'no-store' });
  return response.json();
}

async function getPlugins() {
  const port = process.env.PORT || '555';
  const response = await fetch(
    new URL('/api/plugins', typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : `http://localhost:${port}`),
    { cache: 'no-store' }
  );
  return response.json();
}

async function getArchiveFolders() {
  const port = process.env.PORT || '555';
  const response = await fetch(
    new URL('/api/archive', typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : `http://localhost:${port}`),
    { cache: 'no-store' }
  );
  return response.json();
}


export default async function Home() {
  const [memos, plugins, archiveFolders] = await Promise.all([getData(), getPlugins(), getArchiveFolders()]);

  return (
    <SearchProvider>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Call 555-vibe to vibe it into existence 🤙
            </p>
            <div className="flex items-center gap-4">
              <FilterButtons />
              <div className="w-64">
                <SearchBar />
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5 justify-end">
            <Link
              href={archiveFolders.length > 12 ? `/archive/${archiveFolders[12].name}` : '/archive'}
              className="px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center"
              title={archiveFolders.length > 12 ? archiveFolders[12].name : 'Archive'}
            >
              <ArrowLeftIcon className="w-3 h-3" />
            </Link>
            {archiveFolders.slice(0, 12).reverse().map((folder: { name: string; memoCount: number }) => (
              <Link
                key={folder.name}
                href={`/archive/${folder.name}`}
                className="px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                {folder.name}
              </Link>
            ))}
            <span className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
              {new Date().toISOString().slice(0, 7)}
            </span>
          </div>

          <PluginLinks plugins={plugins} />

          <Dashboard memos={memos} />

          <MoodSummary memos={memos} />

          <Suspense fallback={<div>Loading...</div>}>
            <MemoList initialMemos={memos} />
          </Suspense>
        </div>
      </main>
    </SearchProvider>
  );
}
