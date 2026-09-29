import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function readMonthlySummary(folderPath: string): Promise<{ hasSummary: boolean; summaryPreview?: string }> {
  try {
    const summaryPath = path.join(folderPath, 'MONTHLY_SUMMARY.md');
    const content = await fs.readFile(summaryPath, 'utf-8');
    if (content.trim()) {
      // Split into paragraphs and get the last one
      const paragraphs = content.split('\n\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'));
      
      const lastParagraph = paragraphs[paragraphs.length - 1] || '';
      
      // Strip markdown formatting for cleaner preview
      const preview = lastParagraph
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/-{3,}/g, '')
        .replace(/\n/g, ' ')
        .trim();
      
      return { hasSummary: true, summaryPreview: preview };
    }
    return { hasSummary: false };
  } catch {
    return { hasSummary: false };
  }
}

interface ArchiveFolder {
  name: string;       // e.g., "2025-12"
  memoCount: number;  // number of .m4a files in the folder
  hasSummary: boolean;
  summaryPreview?: string; // First ~200 chars of summary
}

export async function GET() {
  try {
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const ARCHIVE_DIR = path.join(VOICE_MEMOS_DIR, 'archive');

    let folders: ArchiveFolder[] = [];
    
    try {
      const archiveFolders = await fs.readdir(ARCHIVE_DIR);
      
      // Get memo count and summary for each folder
      folders = await Promise.all(
        archiveFolders.map(async (folderName) => {
          const folderPath = path.join(ARCHIVE_DIR, folderName);
          const stat = await fs.stat(folderPath);
          
          if (!stat.isDirectory()) {
            return null;
          }
          
          const [files, summaryData] = await Promise.all([
            fs.readdir(folderPath),
            readMonthlySummary(folderPath)
          ]);
          const memoCount = files.filter(f => f.endsWith('.m4a')).length;
          
          return {
            name: folderName,
            memoCount,
            ...summaryData
          };
        })
      ).then(results => results.filter((f): f is ArchiveFolder => f !== null));
      
      // Sort by name descending (newest first)
      folders.sort((a, b) => b.name.localeCompare(a.name));
    } catch {
      // Archive directory doesn't exist yet
    }

    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error listing archive folders:', error);
    return NextResponse.json({ error: 'Failed to list archive folders' }, { status: 500 });
  }
}

