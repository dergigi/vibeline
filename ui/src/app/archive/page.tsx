'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchiveBoxIcon, FolderIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface ArchiveFolder {
  name: string;
  memoCount: number;
  hasSummary: boolean;
  summaryPreview?: string;
}

function formatMonthName(folderName: string): string {
  // Convert "2025-12" to "December 2025"
  const [year, month] = folderName.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ArchivePage() {
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFolders() {
      try {
        const response = await fetch('/api/archive');
        if (response.ok) {
          const data = await response.json();
          setFolders(data);
        }
      } catch (error) {
        console.error('Error fetching archive folders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFolders();
  }, []);

  const totalMemos = folders.reduce((sum, f) => sum + f.memoCount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ArchiveBoxIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Archive
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalMemos} memos across {folders.length} months
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12">
            <ArchiveBoxIcon className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No archived memos yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {folders.map((folder) => (
              <Link
                key={folder.name}
                href={`/archive/${folder.name}`}
                className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FolderIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatMonthName(folder.name)}
                    </span>
                    {folder.hasSummary && (
                      <DocumentTextIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" title="Has monthly summary" />
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {folder.memoCount} {folder.memoCount === 1 ? 'memo' : 'memos'}
                  </span>
                </div>
                {folder.summaryPreview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2 pl-8">
                    {folder.summaryPreview}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

