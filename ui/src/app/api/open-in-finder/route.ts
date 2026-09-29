import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import { findMemoBaseDir } from '@/lib/archivePaths';

const execAsync = promisify(exec);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    
    const { filename, fileType = 'audio' } = await request.json();
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    // Auto-detect location by convention
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, filename);

    let filePath: string;
    let normalizedPath: string;

    if (fileType === 'transcript') {
      // For transcript files, look in the transcripts directory with .txt extension
      const TRANSCRIPTS_DIR = path.join(baseDir, 'transcripts');
      filePath = path.join(TRANSCRIPTS_DIR, `${filename}.txt`);
      normalizedPath = path.normalize(filePath);
    } else if (fileType === 'shownotes') {
      // For shownotes files, look in the shownotes directory with .md extension
      const SHOWNOTES_DIR = path.join(baseDir, 'shownotes');
      filePath = path.join(SHOWNOTES_DIR, filename);
      normalizedPath = path.normalize(filePath);
    } else {
      // For audio files (default behavior)
      filePath = path.join(baseDir, filename);
      normalizedPath = path.normalize(filePath);
      
      // If the file doesn't exist, try adding .m4a extension
      if (!existsSync(normalizedPath)) {
        filePath = path.join(baseDir, `${filename}.m4a`);
        normalizedPath = path.normalize(filePath);
      }
    }
    
    // Security check: ensure the file is within the voice memos directory
    if (!normalizedPath.startsWith(VOICE_MEMOS_DIR)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if the file exists
    if (!existsSync(normalizedPath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // On macOS, use the 'open -R' command to reveal the file in Finder
    await execAsync(`open -R "${normalizedPath}"`);
    
    return new NextResponse('File opened in Finder', { status: 200 });
  } catch (error) {
    console.error('Error opening file in Finder:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 