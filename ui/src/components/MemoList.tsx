'use client';

import { useEffect, useState } from 'react';
import { VoiceMemo } from '@/types/VoiceMemo';
import { VoiceMemoCard } from '@/components/VoiceMemoCard';
import { useSearch } from '@/contexts/SearchContext';

interface MemoListProps {
  initialMemos: VoiceMemo[];
}

const ITEMS_PER_PAGE = 10;

export function MemoList({ initialMemos }: MemoListProps) {
  const { setMemos, filteredMemos } = useSearch();
  const [displayedMemos, setDisplayedMemos] = useState<VoiceMemo[]>([]);

  useEffect(() => {
    setMemos(initialMemos);
  }, [initialMemos, setMemos]);

  useEffect(() => {
    setDisplayedMemos(filteredMemos.slice(0, ITEMS_PER_PAGE));
  }, [filteredMemos]);

  const handleLoadMore = () => {
    const currentLength = displayedMemos.length;
    const nextMemos = filteredMemos.slice(currentLength, currentLength + ITEMS_PER_PAGE);
    setDisplayedMemos([...displayedMemos, ...nextMemos]);
  };

  const hasMore = displayedMemos.length < filteredMemos.length;
  
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1">
        {displayedMemos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No voice memos found</p>
          </div>
        ) : (
          displayedMemos.map((memo) => (
            <VoiceMemoCard key={memo.filename} memo={memo} />
          ))
        )}
      </div>
      
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
} 