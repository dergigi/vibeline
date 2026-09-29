'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, FileText, Play } from 'lucide-react';
import { ShareIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

interface ShowNote {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  content: string;
}

interface ShownotesPluginProps {
  files: {
    name: string;
    path: string;
    content?: string;
  }[];
}

const ITEMS_PER_PAGE = 10;

const ShownotesPlugin: React.FC<ShownotesPluginProps> = ({ files }) => {
  const [showNotes, setShowNotes] = useState<ShowNote[]>([]);
  const [displayedNotes, setDisplayedNotes] = useState<ShowNote[]>([]);

  useEffect(() => {
    // Parse show notes from markdown files and fetch titles
    const parseShowNotes = async () => {
      const allShowNotes: ShowNote[] = [];
      
      for (const file of files) {
        // Skip hidden files
        if (file.name.startsWith('.')) {
          continue;
        }
        
        const content = file.content || '';
        if (!content.trim()) continue;

        // Get base filename without extension for title lookup
        const baseFilename = file.name.replace(/\.md$/, '');
        
        // Try to fetch title from titles API
        let title = '';
        try {
          const titleResponse = await fetch(`/api/memos/${baseFilename}`);
          if (titleResponse.ok) {
            const memoData = await titleResponse.json();
            title = memoData.title || '';
          }
        } catch (error) {
          console.log('Could not fetch title for', baseFilename, error);
        }

        // Fallback to extracting title from markdown content
        if (!title) {
          const titleMatch = content.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            title = titleMatch[1];
          } else {
            title = baseFilename.replace(/_/g, ' ');
          }
        }

        const showNote: ShowNote = {
          id: file.name,
          title,
          filename: file.name,
          createdAt: file.name.split('_')[0], // Format: YYYYMMDD
          content
        };
        
        allShowNotes.push(showNote);
      }

      // Sort by creation date (newest first)
      allShowNotes.sort((a, b) => b.filename.localeCompare(a.filename));
      
      setShowNotes(allShowNotes);
      setDisplayedNotes(allShowNotes.slice(0, ITEMS_PER_PAGE));
    };

    parseShowNotes();
  }, [files]);

  const handleLoadMore = () => {
    const currentLength = displayedNotes.length;
    const nextNotes = showNotes.slice(currentLength, currentLength + ITEMS_PER_PAGE);
    setDisplayedNotes([...displayedNotes, ...nextNotes]);
  };

  const handleLoadAll = () => {
    setDisplayedNotes(showNotes);
  };

  const hasMore = displayedNotes.length < showNotes.length;

  const formatDate = (dateStr: string) => {
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return dateStr;
  };

  const formatTime = (filename: string) => {
    const timeMatch = filename.match(/_(\d{6})\./);
    if (timeMatch) {
      const time = timeMatch[1];
      return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
    }
    return '';
  };

  const handleOpenInFinder = async (filename: string): Promise<void> => {
    try {
      const response = await fetch('/api/open-in-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, fileType: 'shownotes' }),
      });

      if (!response.ok) {
        throw new Error('Failed to open file in Finder');
      }
    } catch (error) {
      console.error('Error opening file in Finder:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-12">

      <div className="space-y-6">
        {displayedNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
              <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">No show notes yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Start creating your first show notes</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Add markdown files to the shownotes folder to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {displayedNotes.map((showNote, index) => (
              <div
                key={showNote.id}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/memos/${showNote.filename.replace('.md', '')}`}
                        className="block hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                      >
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {showNote.title}
                        </h3>
                      </Link>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-700 dark:text-blue-300 font-medium">
                            {formatDate(showNote.createdAt)}
                          </span>
                        </div>
                        {formatTime(showNote.filename) && (
                          <div className="flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-full">
                            <Clock className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300 font-medium">
                              {formatTime(showNote.filename)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/memos/${showNote.filename.replace('.md', '')}`}
                      className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      title="View full memo"
                    >
                      <Play className="h-5 w-5 ml-0.5" />
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="prose prose-lg max-w-none dark:prose-invert 
                    prose-headings:text-gray-900 dark:prose-headings:text-gray-100 
                    prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h1:mt-8
                    prose-h2:text-2xl prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-6
                    prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-5
                    prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                    prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                    prose-ul:my-4 prose-ol:my-4
                    prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:mb-2
                    prose-code:text-gray-800 dark:prose-code:text-gray-200 
                    prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:text-sm
                    prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900 prose-pre:rounded-xl prose-pre:p-6 prose-pre:overflow-x-auto
                    prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-6 prose-blockquote:italic
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-table:border-collapse prose-table:w-full
                    prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2
                    prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-2">
                    <ReactMarkdown 
                      components={{
                        // Custom component overrides if needed
                        h1: ({children}) => <h1 className="text-3xl font-bold mb-6 mt-8 text-gray-900 dark:text-gray-100">{children}</h1>,
                        h2: ({children}) => <h2 className="text-2xl font-semibold mb-4 mt-6 text-gray-900 dark:text-gray-100">{children}</h2>,
                        h3: ({children}) => <h3 className="text-xl font-semibold mb-3 mt-5 text-gray-900 dark:text-gray-100">{children}</h3>,
                        p: ({children}) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{children}</p>,
                        ul: ({children}) => <ul className="my-4 list-disc list-inside">{children}</ul>,
                        ol: ({children}) => <ol className="my-4 list-decimal list-inside">{children}</ol>,
                        li: ({children}) => <li className="text-gray-700 dark:text-gray-300 mb-2">{children}</li>,
                        strong: ({children}) => <strong className="text-gray-900 dark:text-gray-100 font-semibold">{children}</strong>,
                        code: ({children}) => <code className="text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-sm">{children}</code>,
                        pre: ({children}) => <pre className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 overflow-x-auto">{children}</pre>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-6 italic">{children}</blockquote>,
                        a: ({children, href}) => <a href={href} className="text-blue-600 dark:text-blue-400 no-underline hover:underline">{children}</a>,
                      }}
                    >
                      {showNote.content}
                    </ReactMarkdown>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleOpenInFinder(showNote.filename)}
                      className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                      title="Open file in Finder"
                    >
                      <ShareIcon className="w-3 h-3" />
                      <span>file</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
        {hasMore && (
          <div className="flex justify-center gap-4 pt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Load More
            </button>
            <button
              onClick={handleLoadAll}
              className="px-8 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Load All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShownotesPlugin;