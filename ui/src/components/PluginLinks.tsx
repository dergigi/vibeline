'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface Plugin {
  id: string;
  name: string;
  path: string;
}

interface PluginLinksProps {
  plugins: Plugin[];
}

export function PluginLinks({ plugins }: PluginLinksProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (plugins.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap gap-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center"
        title={isExpanded ? 'Collapse plugins' : 'Expand plugins'}
      >
        <ChevronRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && plugins.map((plugin) => (
        <Link
          key={plugin.id}
          href={plugin.path}
          className="px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
        >
          /{plugin.id}
        </Link>
      ))}
    </div>
  );
}

