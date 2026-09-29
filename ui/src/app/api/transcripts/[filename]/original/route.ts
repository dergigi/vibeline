import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, filename);
    const TRANSCRIPTS_DIR = path.join(baseDir, 'transcripts');
    
    const originalTranscriptPath = path.join(TRANSCRIPTS_DIR, `${filename}.txt.orig`);
    
    try {
      const originalTranscript = await fs.readFile(originalTranscriptPath, 'utf-8');
      return new NextResponse(originalTranscript, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } catch {
      // If .txt.orig doesn't exist, return 404
      return new NextResponse('Original transcript not found', { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to fetch original transcript' }, { status: 500 });
  }
}
