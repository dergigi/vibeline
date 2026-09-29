'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Calendar, User, Copy, Check, Mic } from 'lucide-react';
import Link from 'next/link';
import { NOSTR_PORTAL } from '@/lib/constants';

interface NostrEvent {
  kind: number;
  id: string;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface YoloPost {
  id: string;
  content: string;
  timestamp: number;
  author: string;
  url?: string;
  tags: string[];
  fileName?: string;
}

interface YoloPostsPluginProps {
  files: {
    name: string;
    path: string;
    content?: string;
    transcript?: string;
  }[];
}

const YoloPostsPlugin: React.FC<YoloPostsPluginProps> = ({ files }) => {
  const [posts, setPosts] = useState<YoloPost[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent' | 'with-urls'>('all');

  useEffect(() => {
    const parsedPosts: YoloPost[] = [];
    
    files.forEach(file => {
      if (file.content) {
        try {
          const event: NostrEvent = JSON.parse(file.content);
          
          // Extract URL from content if present
          const urlMatch = event.content.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : undefined;
          
          // Extract content without URL
          const contentWithoutUrl = event.content.replace(/https?:\/\/[^\s]+/g, '').trim();
          
          // Extract tags from content (words starting with #)
          const tagMatches = event.content.match(/#\w+/g) || [];
          const tags = tagMatches.map(tag => tag.slice(1)); // Remove # symbol
          
          const post: YoloPost = {
            id: event.id,
            content: contentWithoutUrl || event.content,
            timestamp: event.created_at,
            author: event.pubkey.slice(0, 8) + '...' + event.pubkey.slice(-8),
            url,
            tags,
            fileName: file.name.replace('.json', '')
          };
          
          parsedPosts.push(post);
        } catch (error) {
          console.error('Error parsing yolopost:', error);
        }
      }
    });

    // Sort by timestamp (newest first)
    parsedPosts.sort((a, b) => b.timestamp - a.timestamp);
    setPosts(parsedPosts);
  }, [files]);

  const filteredPosts = useMemo(() => {
    switch (filter) {
      case 'recent':
        const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        return posts.filter(post => post.timestamp > oneWeekAgo);
      case 'with-urls':
        return posts.filter(post => post.url);
      default:
        return posts;
    }
  }, [posts, filter]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatContent = (content: string) => {
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Yolo Posts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your spontaneous thoughts and moments shared on Nostr
        </p>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          All Posts ({posts.length})
        </button>
        <button
          onClick={() => setFilter('recent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'recent'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setFilter('with-urls')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'with-urls'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          With Links ({posts.filter(p => p.url).length})
        </button>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            No yoloposts found.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Your spontaneous posts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {post.author}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatTimestamp(post.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(post.id, post.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Copy post ID"
                >
                  {copiedId === post.id ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-gray-900 dark:text-white leading-relaxed">
                  {formatContent(post.content)}
                </p>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* External Link */}
              {post.url && (
                <div className="mb-4">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">Open Link</span>
                  </a>
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => window.open(`nostr:${post.id}`, '_blank')}
                    className="flex items-center space-x-2 text-gray-400 hover:text-purple-500 transition-colors"
                    title="Open in native Nostr client"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">Open Native</span>
                  </button>
                  <a
                    href={`${NOSTR_PORTAL}/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-gray-400 hover:text-purple-500 transition-colors"
                    title="View on Nostr"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">View on Nostr</span>
                  </a>
                  {post.fileName && (
                    <Link
                      href={`/memos/${post.fileName}`}
                      className="flex items-center space-x-2 text-gray-400 hover:text-blue-500 transition-colors"
                      title="View Voice Memo"
                    >
                      <Mic className="w-4 h-4" />
                      <span className="text-sm">Voice Memo</span>
                    </Link>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ID: {post.id.slice(0, 8)}...{post.id.slice(-8)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YoloPostsPlugin;
