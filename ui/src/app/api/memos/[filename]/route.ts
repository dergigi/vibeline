import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { BlossomData } from '@/types/VoiceMemo';
import { findMemoBaseDir, buildAudioUrl, getArchiveMonthFromFilename } from '@/lib/archivePaths';

async function readFileIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

async function readBlossomDataIfExists(filePath: string): Promise<BlossomData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.trim()) {
      const data = JSON.parse(content);
      // Only return blossom data if it has a valid URL
      if (data && data.url && data.url.trim()) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function readYoloPostDataIfExists(filePath: string): Promise<{ id: string } | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.trim()) {
      const data = JSON.parse(content);
      // Only return yolopost data if it has a valid ID
      if (data && data.id && data.id.trim()) {
        return { id: data.id };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function parseTimestampFromFilename(filename: string): string {
  const year = filename.slice(0, 4);
  const month = filename.slice(4, 6);
  const day = filename.slice(6, 8);
  const hour = filename.slice(9, 11);
  const minute = filename.slice(11, 13);
  const second = filename.slice(13, 15);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    
    const { filename } = await params;
    const baseFilename = filename;
    
    // Auto-detect location by convention
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, baseFilename);
    
    // Determine archivePath for UI display (if file is in archive)
    const isInArchive = baseDir.includes('/archive/');
    const archivePath = isInArchive ? getArchiveMonthFromFilename(baseFilename) : undefined;
    
    const TRANSCRIPTS_DIR = path.join(baseDir, 'transcripts');
    const SUMMARIES_DIR = path.join(baseDir, 'summaries');
    const TODOS_DIR = path.join(baseDir, 'TODOs');
    const TITLES_DIR = path.join(baseDir, 'titles');
    const BLOSSOMS_DIR = path.join(baseDir, 'blossoms');
    const YOLOPOSTS_DIR = path.join(baseDir, 'yoloposts');
    
    // Get content from each plugin directory
    // Check for cleaned transcript (main .txt file) and original (.txt.orig file)
    const [transcript, originalTranscript, summary, todos, title, blossom, yolopostData] = await Promise.all([
      readFileIfExists(path.join(TRANSCRIPTS_DIR, `${baseFilename}.txt`)),
      readFileIfExists(path.join(TRANSCRIPTS_DIR, `${baseFilename}.txt.orig`)),
      readFileIfExists(path.join(SUMMARIES_DIR, `${baseFilename}.txt`)),
      readFileIfExists(path.join(TODOS_DIR, `${baseFilename}.md`)),
      readFileIfExists(path.join(TITLES_DIR, `${baseFilename}.txt`)),
      readBlossomDataIfExists(path.join(BLOSSOMS_DIR, `${baseFilename}.json`)),
      readYoloPostDataIfExists(path.join(YOLOPOSTS_DIR, `${baseFilename}.json`))
    ]);

    // If .txt.orig exists, it means the main .txt file is cleaned
    const isCleanedTranscript = !!originalTranscript;

    const memo = {
      filename: baseFilename,
      transcript,
      isCleanedTranscript,
      summary,
      todos,
      title: title?.trim() || undefined,
      blossom,
      yolopost: yolopostData,
      path: path.join(TODOS_DIR, `${baseFilename}.md`),
      createdAt: parseTimestampFromFilename(baseFilename),
      audioUrl: buildAudioUrl(baseFilename),
      archivePath
    };

    return NextResponse.json(memo);
  } catch (error) {
    console.error('Error processing memo:', error);
    return NextResponse.json({ error: 'Failed to process memo' }, { status: 500 });
  }
}
