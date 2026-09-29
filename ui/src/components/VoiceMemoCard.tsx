"use client";

import React from 'react';
import { VoiceMemo } from '@/types/VoiceMemo';
import { motion } from 'framer-motion';
import { PlayIcon, PauseIcon, ChevronDownIcon, ChevronUpIcon, ArrowPathIcon, CheckIcon, ShareIcon, SparklesIcon, ClipboardDocumentCheckIcon, PencilSquareIcon, TrashIcon, ForwardIcon, BackwardIcon, ArrowUpIcon, PencilIcon, ArchiveBoxIcon } from '@heroicons/react/24/solid';
import { SpellCheck, Flower, Waypoints } from 'lucide-react';
import { useState, useRef, useCallback } from 'react'; // Import useCallback
import { useSearch } from '@/contexts/SearchContext';
import { DraftEditor } from './DraftEditor';
import Link from 'next/link';
import { NOSTR_PORTAL } from '@/lib/constants';

interface VoiceMemoCardProps {
  memo: VoiceMemo;
  isMemoPage?: boolean;
}

export const VoiceMemoCard: React.FC<VoiceMemoCardProps> = ({ memo, isMemoPage = false }) => {
  const { setSearchTerm } = useSearch();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isTodosExpanded, setIsTodosExpanded] = useState(isMemoPage);
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);
  const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [isTodosCopied, setIsTodosCopied] = useState(false);
  const [isPromptsCopied, setIsPromptsCopied] = useState(false);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSummaryRefreshing, setIsSummaryRefreshing] = useState(false);
  const [isTodosRefreshing, setIsTodosRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<{ [key: string]: number }>({});
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  const deleteIntervals = useRef<{ [key: string]: NodeJS.Timeout | null }>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [refreshFiles, setRefreshFiles] = useState<Array<{ category: string; filename: string; fullPath: string }>>([]);
  const [refreshStep, setRefreshStep] = useState<'list' | 'confirm' | 'deleting'>('list');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState<Array<{ category: string; filename: string; fullPath: string }>>([]);
  const [deleteStep, setDeleteStep] = useState<'list' | 'confirm' | 'deleting'>('list');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  // Add state to manage optimistic UI updates for todos
  const [optimisticTodos, setOptimisticTodos] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showCleanedTranscript, setShowCleanedTranscript] = useState(true);
  const [originalTranscript, setOriginalTranscript] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const SPEED_OPTIONS = [1, 1.5, 2, 3];

  const fetchOriginalTranscript = async (): Promise<void> => {
    if (originalTranscript !== null) return; // Already fetched
    
    try {
      const response = await fetch(`/api/transcripts/${memo.filename}/original`);
      if (response.ok) {
        const text = await response.text();
        setOriginalTranscript(text);
      }
    } catch (error) {
      console.error('Failed to fetch original transcript:', error);
    }
  };

  const handleTranscriptToggle = async (): Promise<void> => {
    if (!memo.isCleanedTranscript) return;
    
    if (showCleanedTranscript) {
      // Switching to original transcript
      await fetchOriginalTranscript();
    }
    setShowCleanedTranscript(!showCleanedTranscript);
  };

  const hasTodos = (memo.todos?.trim().length ?? 0) > 0;
  const hasPrompts = (memo.prompts?.trim().length ?? 0) > 0;
  const hasDrafts = (memo.drafts?.trim().length ?? 0) > 0;

  const cleanTodos = (todos: string): { lines: string[], originalIndices: number[] } => {
    if (!todos) return { lines: [], originalIndices: [] };
    const allLines = todos.split('\n');
    const result = allLines.reduce((acc, line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        acc.lines.push(line);
        acc.originalIndices.push(index);
      }
      return acc;
    }, { lines: [] as string[], originalIndices: [] as number[] });
    return result;
  };



  const togglePlayPause = (): void => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const togglePlaybackSpeed = (): void => {
    if (audioRef.current) {
      const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
      const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
      const newSpeed = SPEED_OPTIONS[nextIndex];
      audioRef.current.playbackRate = newSpeed;
      setPlaybackSpeed(newSpeed);
    }
  };

  const skipForward = (): void => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.readyState >= 2) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const newTime = Math.min(currentTime + 30, duration);
      
      try {
        audioRef.current.currentTime = newTime;
        // Force a small delay to ensure the seek operation completes
        setTimeout(() => {
          if (audioRef.current && Math.abs(audioRef.current.currentTime - newTime) > 1) {
            audioRef.current.currentTime = newTime;
          }
        }, 100);
      } catch (error) {
        console.error('Error seeking forward:', error);
      }
    }
  };

  const skipBackward = (): void => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.readyState >= 2) {
      const currentTime = audioRef.current.currentTime;
      const newTime = Math.max(currentTime - 10, 0);
      
      try {
        audioRef.current.currentTime = newTime;
        // Force a small delay to ensure the seek operation completes
        setTimeout(() => {
          if (audioRef.current && Math.abs(audioRef.current.currentTime - newTime) > 1) {
            audioRef.current.currentTime = newTime;
          }
        }, 100);
      } catch (error) {
        console.error('Error seeking backward:', error);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  };

  const handleLoadedMetadata = (): void => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!audioRef.current || !duration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimelineDrag = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!audioRef.current || !duration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    setCurrentTime(newTime);
    setIsSeeking(true);
  };

  const handleTimelineDragEnd = (): void => {
    if (!audioRef.current || !duration) return;
    
    audioRef.current.currentTime = currentTime;
    setIsSeeking(false);
  };

  const formatTimeAgo = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // If years are different, return the formatted date with year
    if (dateObj.getFullYear() !== now.getFullYear()) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(dateObj);
    }

    // For same year, check if it's today/yesterday
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const diffInDays = Math.floor((today.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatShortDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(dateObj);
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).length;
  };

  const getLastParagraph = (text: string): string => {
    const paragraphs = text.trim().split(/\n\s*\n/);
    return paragraphs[paragraphs.length - 1];
  };

  const extractHashtags = (text: string): string[] => {
    // Common words to filter out
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
      'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
      'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'should', 'could', 'was', 'were', 'is', 'am', 'are', 'been', 'being', 'had', 'has', 'did', 'doing', 'does'
    ]);

    // Split into words, convert to lowercase, remove punctuation
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3) // Only words longer than 3 characters
      .filter(word => !stopWords.has(word)); // Remove stop words

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Sort by frequency and get top 3
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  };

  const handleCopyTodos = async (): Promise<void> => {
    if (memo.todos) {
      try {
        await navigator.clipboard.writeText(memo.todos);
        setIsTodosCopied(true);
        setTimeout(() => setIsTodosCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleCopyPrompts = async (): Promise<void> => {
    if (memo.prompts) {
      try {
        await navigator.clipboard.writeText(memo.prompts);
        setIsPromptsCopied(true);
        setTimeout(() => setIsPromptsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleHashtagClick = (tag: string): void => {
    setSearchTerm(tag);
  };

  const handleTitleEdit = (): void => {
    setIsEditingTitle(true);
    setEditingTitle(memo.title || '');
  };

  const handleTitleSave = async (): Promise<void> => {
    if (!editingTitle.trim()) return;
    
    setIsSavingTitle(true);
    try {
      const response = await fetch('/api/titles/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filename: memo.filename,
          title: editingTitle.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }

      // Update the memo object optimistically
      memo.title = editingTitle.trim();
      setIsEditingTitle(false);
      setEditingTitle('');
    } catch (error) {
      console.error('Error updating title:', error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleTitleCancel = (): void => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  const handleTitleBlur = (): void => {
    // Don't save on blur - only save on explicit Enter key press
    // Just cancel the editing mode
    handleTitleCancel();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleTitleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleTitleCancel();
    }
  };
  
  // Function to handle toggling a todo item
  const handleTodoToggle = useCallback(async (lineNumber: number, currentChecked: boolean) => {
    // Get the relative path by taking the last two parts (TODOs/filename.md)
    const pathParts = memo.path.split('/');
    const filePath = pathParts.slice(-2).join('/');
    const newChecked = !currentChecked;
  
    // Optimistic UI update
    const lines = (optimisticTodos ?? memo.todos ?? '').split('\n');
    if (lineNumber >= 0 && lineNumber < lines.length) {
      const line = lines[lineNumber];
      const match = line.match(/^(\s*-\s*\[)[ x](\]\s*.*)/);
      if (match) {
        lines[lineNumber] = `${match[1]}${newChecked ? 'x' : ' '}${match[2]}`;
        setOptimisticTodos(lines.join('\n'));
      }
    }
  
    try {
      const response = await fetch('/api/todos/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filePath, 
          lineNumber, 
          completed: newChecked
        }),
      });
  
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      setOptimisticTodos(null);
    }
  }, [memo.path, memo.todos, optimisticTodos]);

  // Function to handle checking all todos
  const handleCheckAllTodos = useCallback(async () => {
    const pathParts = memo.path.split('/');
    const filePath = pathParts.slice(-2).join('/');
    
    // Get all unchecked todo lines
    const lines = (optimisticTodos ?? memo.todos ?? '').split('\n');
    const uncheckedLines: number[] = [];
    
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*-\s*\[)\s(\]\s*.*)/);
      if (match) {
        uncheckedLines.push(index);
      }
    });
    
    if (uncheckedLines.length === 0) return;
    
    // Optimistic UI update - check all unchecked todos
    const updatedLines = [...lines];
    uncheckedLines.forEach(lineNumber => {
      const line = updatedLines[lineNumber];
      const match = line.match(/^(\s*-\s*\[)\s(\]\s*.*)/);
      if (match) {
        updatedLines[lineNumber] = `${match[1]}x${match[2]}`;
      }
    });
    setOptimisticTodos(updatedLines.join('\n'));
    
    try {
      // Make API calls for all unchecked todos
      const promises = uncheckedLines.map(lineNumber =>
        fetch('/api/todos/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            filePath, 
            lineNumber, 
            completed: true
          }),
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to check all todos:', error);
      setOptimisticTodos(null);
    }
  }, [memo.path, memo.todos, optimisticTodos]);

  const handleClearTodos = useCallback(async () => {
    // Optimistic UI update - clear todos
    setOptimisticTodos('TODOs cleared');
    
    try {
      const response = await fetch('/api/todos/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filename: memo.filename,
          content: ''
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear todos');
      }

      // Update the memo object optimistically
      memo.todos = 'TODOs cleared';
    } catch (error) {
      console.error('Failed to clear todos:', error);
      setOptimisticTodos(null);
    }
  }, [memo]);
  
  const handleShare = async (): Promise<void> => {
    try {
      const response = await fetch('/api/open-in-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: memo.filename }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to open file in Finder');
      }
    } catch (error) {
      console.error('Error opening file in Finder:', error);
    }
  };

  const handleShareTranscript = async (): Promise<void> => {
    try {
      const response = await fetch('/api/open-in-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: memo.filename, fileType: 'transcript' }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to open transcript file in Finder');
      }
    } catch (error) {
      console.error('Error opening transcript file in Finder:', error);
    }
  };

  const handleDeletePluginFiles = async (plugin: string): Promise<void> => {
    if (!memo.filename) return;
    
    // Set the appropriate loading state
    switch (plugin) {
      case 'transcripts':
        setIsRefreshing(true);
        break;
      case 'summaries':
        setIsSummaryRefreshing(true);
        break;
      case 'todos':
        setIsTodosRefreshing(true);
        break;
      case 'titles':
        setIsRefreshing(true);
        break;
    }
    
    try {
      const response = await fetch('/api/plugins/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filename: memo.filename,
          plugin
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${plugin} files`);
      }

      // Clear the appropriate field from the memo object
      switch (plugin) {
        case 'transcripts':
          memo.transcript = undefined;
          break;
        case 'summaries':
          memo.summary = undefined;
          break;
        case 'todos':
          memo.todos = undefined;
          break;
        case 'titles':
          memo.title = undefined;
          break;
      }
      
      console.log(`${plugin} files deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${plugin} files:`, error);
    } finally {
      // Reset the appropriate loading state
      switch (plugin) {
        case 'transcripts':
          setIsRefreshing(false);
          break;
        case 'summaries':
          setIsSummaryRefreshing(false);
          break;
        case 'todos':
          setIsTodosRefreshing(false);
          break;
        case 'titles':
          setIsRefreshing(false);
          break;
      }
      // Reset countdown and deleting states
      setCountdown(prev => ({ ...prev, [plugin]: 0 }));
      setIsDeleting(prev => ({ ...prev, [plugin]: false }));
    }
  };

  const startDeleteCountdown = (plugin: string): void => {
    // Clear any existing interval for this plugin
    if (deleteIntervals.current[plugin]) {
      clearInterval(deleteIntervals.current[plugin]);
    }

    setCountdown(prev => ({ ...prev, [plugin]: 5 }));
    setIsDeleting(prev => ({ ...prev, [plugin]: true }));
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev[plugin] - 1;
        if (newCount <= 0) {
          clearInterval(interval);
          handleDeletePluginFiles(plugin);
          return { ...prev, [plugin]: 0 };
        }
        return { ...prev, [plugin]: newCount };
      });
    }, 1000);

    // Store the interval ID
    deleteIntervals.current[plugin] = interval;
  };

  const cancelDelete = (plugin: string): void => {
    // Clear the interval
    if (deleteIntervals.current[plugin]) {
      clearInterval(deleteIntervals.current[plugin]);
      deleteIntervals.current[plugin] = null;
    }
    
    setCountdown(prev => ({ ...prev, [plugin]: 0 }));
    setIsDeleting(prev => ({ ...prev, [plugin]: false }));
  };

  const handleRefreshAll = async (): Promise<void> => {
    if (!memo.filename) return;
    
    setRefreshStep('list');
    setShowRefreshDialog(true);
    
    try {
      const response = await fetch(`/api/memos/${memo.filename}/files`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setRefreshFiles(data.files);
      setRefreshStep('confirm');
    } catch (error) {
      console.error('Error fetching files:', error);
      setShowRefreshDialog(false);
    }
  };

  const handleConfirmRefresh = async (): Promise<void> => {
    if (!memo.filename) return;
    
    setRefreshStep('deleting');
    
    try {
      const response = await fetch(`/api/memos/${memo.filename}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh memo');
      }

      const data = await response.json();
      console.log('Refresh completed:', data);
      
      // Clear all memo data to trigger re-generation
      memo.transcript = undefined;
      memo.summary = undefined;
      memo.todos = undefined;
      memo.title = undefined;
      memo.blossom = undefined;
      memo.yolopost = undefined;
      
      // Close dialog and reset state
      setShowRefreshDialog(false);
      setRefreshFiles([]);
      setRefreshStep('list');
      
      // Reload the page to trigger regeneration
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing memo:', error);
      setRefreshStep('confirm');
    }
  };

  const handleCancelRefresh = (): void => {
    setShowRefreshDialog(false);
    setRefreshFiles([]);
    setRefreshStep('list');
  };

  const handleDeleteAll = async (): Promise<void> => {
    if (!memo.filename) return;
    
    setDeleteStep('list');
    setShowDeleteDialog(true);
    
    try {
      const response = await fetch(`/api/memos/${memo.filename}/files/all`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setDeleteFiles(data.files);
      setDeleteStep('confirm');
    } catch (error) {
      console.error('Error fetching files:', error);
      setShowDeleteDialog(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!memo.filename) return;
    
    setDeleteStep('deleting');
    
    try {
      const response = await fetch(`/api/memos/${memo.filename}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete memo');
      }

      const data = await response.json();
      console.log('Delete completed:', data);
      
      // Redirect to home page since the memo is gone
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting memo:', error);
      setDeleteStep('confirm');
    }
  };

  const handleCancelDelete = (): void => {
    setShowDeleteDialog(false);
    setDeleteFiles([]);
    setDeleteStep('list');
    setDeleteConfirmation('');
  };

  // Clean up intervals when component unmounts
  React.useEffect(() => {
    const intervals = deleteIntervals.current;
    return () => {
      Object.values(intervals).forEach(interval => {
        if (interval) {
          clearInterval(interval);
        }
      });
    };
  }, []);

  return (
    <>
      <motion.div
        id={`memo-${memo.filename}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link
              href={`/memos/${memo.filename}${memo.archivePath ? `?archive=${memo.archivePath}` : ''}`}
              className="block hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleTitleBlur}
                      className="text-lg font-medium text-gray-900 dark:text-gray-100 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none px-1 py-0.5 flex-1"
                      autoFocus
                      disabled={isSavingTitle}
                    />
                    {isSavingTitle && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    )}
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {memo.title || formatTimeAgo(memo.createdAt)}
                    </h3>
                    {memo.archivePath && (
                      <span 
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                        title={`Archived: ${memo.archivePath}`}
                      >
                        <ArchiveBoxIcon className="w-3 h-3" />
                      </span>
                    )}
                    {memo.title && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTitleEdit();
                          }}
                          className="p-1 transition-colors text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          title="Edit title"
                        >
                          <PencilIcon className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isDeleting['titles']) {
                              cancelDelete('titles');
                            } else {
                              startDeleteCountdown('titles');
                            }
                          }}
                          className={`p-1 transition-colors flex items-center gap-1 ${
                            isDeleting['titles'] 
                              ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                          }`}
                          title="Refresh title (delete and regenerate)"
                        >
                          {isDeleting['titles'] ? (
                            <>
                              <TrashIcon className="w-3 h-3" />
                              <span className="text-xs">{countdown['titles']}s</span>
                            </>
                          ) : (
                            <ArrowPathIcon className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {memo.title && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Extract date from filename (format: YYYYMMDD_HHMMSS)
                        const dateMatch = memo.filename.match(/^(\d{8})/);
                        if (dateMatch) {
                          setSearchTerm(dateMatch[1]);
                        }
                      }}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      title="Search for this day"
                    >
                      {formatTimeAgo(memo.createdAt)}
                    </button>
                    {' · '}
                    {formatShortDate(memo.createdAt)}
                  </>
                )}
                {!memo.title && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Extract date from filename (format: YYYYMMDD_HHMMSS)
                      const dateMatch = memo.filename.match(/^(\d{8})/);
                      if (dateMatch) {
                        setSearchTerm(dateMatch[1]);
                      }
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    title="Search for this day"
                  >
                    {formatShortDate(memo.createdAt)}
                  </button>
                )}
                {duration && ` · ${formatDuration(duration)}`}
                {memo.transcript && ` · ${countWords(memo.transcript)} words`}
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlaybackSpeed}
              className={`px-1.5 py-0.5 rounded-md transition-colors text-[10px] ${
                playbackSpeed > 1
                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              title="Click to change playback speed"
            >
              {playbackSpeed}x
            </button>
            <button
              onClick={skipBackward}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Skip backward 10 seconds"
            >
              <BackwardIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200"
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <PlayIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>
            <button
              onClick={skipForward}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              title="Skip forward 30 seconds"
            >
              <ForwardIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        {duration && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(currentTime)}
              </span>
              <div className="flex-1 relative">
                <div
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative"
                  onClick={handleTimelineClick}
                  onMouseDown={handleTimelineDrag}
                  onMouseMove={(e) => {
                    if (e.buttons === 1) handleTimelineDrag(e);
                  }}
                  onMouseUp={handleTimelineDragEnd}
                  onMouseLeave={handleTimelineDragEnd}
                >
                  <div
                    className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-100"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-indigo-600 dark:bg-indigo-300 rounded-full shadow-sm"
                    style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {memo.transcript && (
            <div>
              <div 
                className="flex items-center justify-between mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Transcript
                  </h4>
                  {memo.isCleanedTranscript && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTranscriptToggle();
                      }}
                      className={`p-1 transition-colors ${
                        showCleanedTranscript
                          ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                      } rounded`}
                      title={showCleanedTranscript ? "Show original transcript" : "Show cleaned transcript"}
                    >
                      <SpellCheck className="w-3 h-3" />
                    </button>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDeleting['transcripts']) {
                        cancelDelete('transcripts');
                      } else {
                        startDeleteCountdown('transcripts');
                      }
                    }}
                    className={`p-1 transition-colors flex items-center gap-1 ${
                      isDeleting['transcripts'] 
                        ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                    disabled={isRefreshing}
                  >
                    {isDeleting['transcripts'] ? (
                      <>
                        <TrashIcon className="w-3 h-3" />
                        <span className="text-xs">{countdown['transcripts']}s</span>
                      </>
                    ) : (
                      <ArrowPathIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {isTranscriptExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </div>
              </div>
              <p className={`text-sm text-gray-600 dark:text-gray-400 text-left ${isTranscriptExpanded ? '' : 'line-clamp-5'}`}>
                {showCleanedTranscript ? memo.transcript : (originalTranscript || memo.transcript)}
              </p>
            </div>
          )}

          {memo.summary && (
            <div>
              <div 
                className="flex items-center justify-between mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              >
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Summary
                  </h4>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDeleting['summaries']) {
                        cancelDelete('summaries');
                      } else {
                        startDeleteCountdown('summaries');
                      }
                    }}
                    className={`p-1 transition-colors flex items-center gap-1 ${
                      isDeleting['summaries'] 
                        ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                        : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                    }`}
                    disabled={isSummaryRefreshing}
                  >
                    {isDeleting['summaries'] ? (
                      <>
                        <TrashIcon className="w-3 h-3" />
                        <span className="text-xs">{countdown['summaries']}s</span>
                      </>
                    ) : (
                      <ArrowPathIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {isSummaryExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </div>
              </div>
              <p className={`text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line text-left`}>
                {isSummaryExpanded ? memo.summary.trim() : getLastParagraph(memo.summary)}
              </p>
            </div>
          )}

          <audio
            ref={audioRef}
            src={memo.audioUrl}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={() => {
              if (audioRef.current && !isSeeking) {
                setCurrentTime(audioRef.current.currentTime);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-col gap-4 mt-4 pt-4">
            {hasTodos && (
              <div>
                <div 
                  className="flex items-center justify-between mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  onClick={() => setIsTodosExpanded(!isTodosExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      TODOs
                    </h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isDeleting['todos']) {
                          cancelDelete('todos');
                        } else {
                          startDeleteCountdown('todos');
                        }
                      }}
                      className={`p-1 transition-colors flex items-center gap-1 ${
                        isDeleting['todos'] 
                          ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300' 
                          : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                      }`}
                      disabled={isTodosRefreshing}
                    >
                      {isDeleting['todos'] ? (
                        <>
                          <TrashIcon className="w-3 h-3" />
                          <span className="text-xs">{countdown['todos']}s</span>
                        </>
                      ) : (
                        <ArrowPathIcon className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-gray-500 dark:text-gray-400">
                      {isTodosExpanded ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
                {isTodosExpanded && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2 pl-1">
                      {(() => {
                        const { lines, originalIndices } = cleanTodos(optimisticTodos ?? memo.todos ?? '');
                        return lines.map((line, displayIndex) => {
                          const originalIndex = originalIndices[displayIndex];
                          // Match markdown checkbox format: "- [ ] text" or "- [x] text" (allowing for whitespace variations)
                          const match = line.match(/^(\s*-\s*\[\s*)([ x])(\s*\]\s*)(.*)/);
                          if (match) {
                            const indent = match[1].match(/^\s*/)?.[0] || '';
                            const isChecked = match[2] === 'x';
                            const text = match[4];
                            return (
                              <div key={displayIndex} className="flex items-center gap-2" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTodoToggle(originalIndex, isChecked)}
                                  className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-indigo-500 focus:ring-offset-0 dark:focus:ring-offset-gray-800 cursor-pointer"
                                />
                                <label className={`flex-1 ${isChecked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} cursor-pointer`} onClick={() => handleTodoToggle(originalIndex, isChecked)}>
                                  {text || <span className="italic text-gray-400 dark:text-gray-600">(empty)</span>}
                                </label>
                              </div>
                            );
                          }
                          const indentMatch = line.match(/^\s*/);
                          const indent = indentMatch ? indentMatch[0] : '';
                          return <div key={displayIndex} style={{ paddingLeft: `${indent.length * 0.5}em` }}>{line.trim() || <br />}</div>;
                        });
                      })()}
                    </div>
                    {(() => {
                      const { lines } = cleanTodos(optimisticTodos ?? memo.todos ?? '');
                      const hasUncheckedItems = lines.some(line => {
                        const match = line.match(/^(\s*-\s*\[)\s(\]\s*.*)/);
                        return match !== null;
                      });
                      
                      return hasUncheckedItems ? (
                        <div className="flex justify-start mt-2 gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckAllTodos();
                            }}
                            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                          >
                            <CheckIcon className="w-3 h-3" />
                            <span>all</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyTodos();
                            }}
                            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                          >
                            {isTodosCopied ? (
                              <>
                                <CheckIcon className="w-3 h-3" />
                                <span>copied!</span>
                              </>
                            ) : (
                              <>
                                <ClipboardDocumentCheckIcon className="w-3 h-3" />
                                <span>copy</span>
                              </>
                            )}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearTodos();
                            }}
                            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                          >
                            <TrashIcon className="w-3 h-3" />
                            <span>clear</span>
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}

            {hasPrompts && (
              <div>
                <div 
                  className="flex items-center justify-between mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  onClick={() => setIsPromptsExpanded(!isPromptsExpanded)}
                >
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prompt
                  </h4>
                  <div className="flex items-center gap-1">
                    <div className="text-gray-500 dark:text-gray-400">
                      {isPromptsExpanded ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPrompts();
                      }}
                      className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                    >
                      {isPromptsCopied ? (
                        <>
                          <CheckIcon className="w-3 h-3" />
                          <span>copied!</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-3 h-3" />
                          <span>copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {isPromptsExpanded && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line text-left">
                    {memo.prompts?.trim()}
                  </p>
                )}
              </div>
            )}

            {hasDrafts && (
              <div>
                <div 
                  className="flex items-center justify-between mb-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  onClick={() => setIsDraftsExpanded(!isDraftsExpanded)}
                >
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Draft
                  </h4>
                  <div className="flex items-center gap-1">
                    <div className="text-gray-500 dark:text-gray-400">
                      {isDraftsExpanded ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDraftEditor(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                    >
                      <PencilSquareIcon className="w-3 h-3" />
                      <span>edit</span>
                    </button>
                  </div>
                </div>
                {isDraftsExpanded && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line text-left">
                    {memo.drafts?.trim()}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between items-end">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title="Scroll to top"
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRefreshAll}
                  className="p-1 rounded-md text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title="Refresh all (delete and regenerate all files)"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="p-1 rounded-md text-gray-400 hover:text-red-700 dark:text-gray-500 dark:hover:text-red-500 transition-colors"
                  title="Delete everything (including audio file)"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                {memo.transcript && (
                  <div className="flex gap-1.5 flex-wrap">
                    {extractHashtags(memo.transcript).map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleHashtagClick(tag)}
                        className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {memo.yolopost && (
                  <a 
                    href={`${NOSTR_PORTAL}/${memo.yolopost!.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                    title="View on Nostr"
                  >
                    <Waypoints className="w-3 h-3" />
                    <span className="font-mono">{memo.yolopost!.id.substring(0, 6)}</span>
                  </a>
                )}
                {memo.blossom && (
                  <a 
                    href={memo.blossom!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                    title="Open blossom file"
                  >
                    <Flower className="w-3 h-3" />
                    <span className="font-mono">{memo.blossom.sha256.substring(0, 6)}</span>
                  </a>
                )}
                <button 
                  onClick={handleShare}
                  className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                >
                  <ShareIcon className="w-3 h-3" />
                  <span>audio</span>
                </button>
                {memo.transcript && (
                  <button 
                    onClick={handleShareTranscript}
                    className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1 min-w-[80px] justify-center"
                  >
                    <ShareIcon className="w-3 h-3" />
                    <span>transcript</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {showDraftEditor && (
        <DraftEditor
          initialContent={memo.drafts || ''}
          onClose={() => setShowDraftEditor(false)}
        />
      )}
      
      {/* Refresh Warning Dialog */}
      {showRefreshDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Refresh All Files
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will delete all generated files (excluding the original audio) and trigger regeneration
                  </p>
                </div>
              </div>
              
              {refreshStep === 'list' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading files...</p>
                </div>
              )}
              
              {refreshStep === 'confirm' && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      The following <strong>{refreshFiles.length} files</strong> will be deleted:
                    </p>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                      {refreshFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{file.category}</span>
                            <span className="text-gray-500 dark:text-gray-500"> / </span>
                            <span className="font-mono">{file.filename}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Warning: This action cannot be undone
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          All generated files will be permanently deleted (the original audio file is protected). The system will automatically regenerate them, but this may take some time.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmRefresh}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Yes, Delete All Files
                    </button>
                    <button
                      onClick={handleCancelRefresh}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {refreshStep === 'deleting' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Deleting files and refreshing...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Dangerous Delete Warning Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    PERMANENTLY DELETE EVERYTHING
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    This will delete ALL files including the original audio recording
                  </p>
                </div>
              </div>
              
              {deleteStep === 'list' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading files...</p>
                </div>
              )}
              
              {deleteStep === 'confirm' && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      The following <strong>{deleteFiles.length} files</strong> will be PERMANENTLY DELETED:
                    </p>
                    <div className="max-h-60 overflow-y-auto border border-red-200 dark:border-red-800 rounded-md p-3 bg-red-50 dark:bg-red-900/20">
                      {deleteFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 py-1">
                          <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{file.category}</span>
                            <span className="text-gray-500 dark:text-gray-500"> / </span>
                            <span className="font-mono">{file.filename}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          THIS ACTION CANNOT BE UNDONE
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          All files including the original audio recording will be permanently deleted. This action is irreversible.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type the filename to confirm deletion:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder={memo.filename}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />

                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmDelete}
                      disabled={deleteConfirmation !== memo.filename}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      PERMANENTLY DELETE EVERYTHING
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {deleteStep === 'deleting' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Permanently deleting all files...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 