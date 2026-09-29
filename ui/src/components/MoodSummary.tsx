'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMasksTheater } from '@fortawesome/free-solid-svg-icons';
import { analyzeEmotions, MoodColor } from '@/lib/moodUtils';
import { VoiceMemo } from '@/types/VoiceMemo';

const MOOD_COLOR_CLASSES: Record<MoodColor, string> = {
  yellow: 'text-amber-600 dark:text-amber-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
};

interface MoodSummaryProps {
  memos: VoiceMemo[];
}

export default function MoodSummary({ memos }: MoodSummaryProps) {
  const moodAnalysis = useMemo(() => {
    const combinedText = memos
      .map(memo => `${memo.transcript || ''} ${memo.summary || ''}`)
      .join(' ');
    return analyzeEmotions(combinedText);
  }, [memos]);

  if (moodAnalysis.topEmotions.length === 0) {
    return null;
  }

  return (
    <Link 
      href="/plugins/moods"
      className="block bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 mb-8 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <FontAwesomeIcon icon={faMasksTheater} className="w-4 h-4" />
        {moodAnalysis.topEmotions.map((e, i) => (
          <span key={e.emotion}>
            <span className={MOOD_COLOR_CLASSES[e.color]}>{e.emotion}</span>
            {i < moodAnalysis.topEmotions.length - 1 && ', '}
          </span>
        ))}
      </p>
    </Link>
  );
}

