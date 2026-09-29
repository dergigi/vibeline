'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { VoiceMemo } from '@/types/VoiceMemo';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredMemos: VoiceMemo[];
  setMemos: (memos: VoiceMemo[]) => void;
  activeFilters: Set<string>;
  toggleFilter: (filter: string) => void;
}

interface SearchProviderProps {
  children: React.ReactNode;
  isArchiveView?: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Helper function to extract quoted phrases from search term
const extractQuotedPhrases = (searchTerm: string): string[] => {
  const matches = searchTerm.match(/"([^"]*)"/g);
  if (!matches) return [];
  return matches.map(match => match.slice(1, -1)); // Remove quotes
};

// Helper function to check if all phrases are present in text
const containsAllPhrases = (text: string, phrases: string[]): boolean => {
  if (phrases.length === 0) return true;
  const lowerText = text.toLowerCase();
  return phrases.every(phrase => lowerText.includes(phrase.toLowerCase()));
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children, isArchiveView = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  // Filter memos based on search term and active filters
  const filteredMemos = useMemo(() => {
    let filtered = memos;
    
    // By default, hide archived memos on the main view (not on archive pages)
    if (!isArchiveView && !activeFilters.has('archived')) {
      filtered = filtered.filter(memo => !memo.archivePath);
    }
    
    // Apply text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      
      if (term.startsWith('#')) {
        // Handle hashtag search - extract hashtags without the # symbol
        const searchTag = term.slice(1);
        filtered = filtered.filter(memo => {
          const hashtags = memo.transcript
            ? memo.transcript.toLowerCase().match(/#\w+/g)?.map(tag => tag.slice(1)) || []
            : [];
          return hashtags.includes(searchTag);
        });
      } else {
        // Extract quoted phrases for exact phrase matching
        const quotedPhrases = extractQuotedPhrases(searchTerm);
        
        if (quotedPhrases.length > 0) {
          // If we have quoted phrases, require ALL phrases to be present in transcript
          filtered = filtered.filter(memo => {
            const transcript = memo.transcript || '';
            return containsAllPhrases(transcript, quotedPhrases);
          });
        } else {
          // Regular search (fallback to original behavior)
          filtered = filtered.filter(memo => {
            const transcript = memo.transcript?.toLowerCase() || '';
            const summary = memo.summary?.toLowerCase() || '';
            const todos = memo.todos?.toLowerCase() || '';
            const prompts = memo.prompts?.toLowerCase() || '';
            const drafts = memo.drafts?.toLowerCase() || '';
            const filename = memo.filename?.toLowerCase() || '';
            
            return transcript.includes(term) || 
                   summary.includes(term) || 
                   todos.includes(term) || 
                   prompts.includes(term) || 
                   drafts.includes(term) ||
                   filename.includes(term);
          });
        }
      }
    }

    // Apply filters
    if (activeFilters.size > 0) {
      filtered = filtered.filter(memo => {
        const hasTodos = (memo.todos?.trim().length ?? 0) > 0;
        const hasPrompts = (memo.prompts?.trim().length ?? 0) > 0;
        const hasDrafts = (memo.drafts?.trim().length ?? 0) > 0;
        const hasBlossom = memo.blossom && memo.blossom.url && memo.blossom.url.trim();
        const hasYoloPost = memo.yolopost && memo.yolopost.id && memo.yolopost.id.trim();

        if (activeFilters.has('todos') && !hasTodos) return false;
        if (activeFilters.has('prompts') && !hasPrompts) return false;
        if (activeFilters.has('drafts') && !hasDrafts) return false;
        if (activeFilters.has('blossom') && !hasBlossom) return false;
        if (activeFilters.has('yolopost') && !hasYoloPost) return false;
        return true;
      });
    }

    return filtered;
  }, [searchTerm, memos, activeFilters, isArchiveView]);

  const value = {
    searchTerm,
    setSearchTerm,
    filteredMemos,
    setMemos,
    activeFilters,
    toggleFilter
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}; 