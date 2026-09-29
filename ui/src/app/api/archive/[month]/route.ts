import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import { BlossomData } from '@/types/VoiceMemo';
import { getBasePath, buildAudioUrl } from '@/lib/archivePaths';

interface Memo {
  filename: string;
  transcript?: string;
  isCleanedTranscript?: boolean;
  summary?: string;
  todos?: string;
  title?: string;
  createdAt: string;
  path: string;
  audioUrl: string;
  archivePath?: string;
  blossom?: BlossomData;
  yolopost?: { id: string };
  duration?: number; // in seconds
}

interface ArchiveMonthResponse {
  memos: Memo[];
  monthlySummary?: string;
}

async function readFileIfExists(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

async function readBlossomDataIfExists(filePath: string): Promise<BlossomData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (content.trim()) {
      const data = JSON.parse(content);
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
      if (data && data.id && data.id.trim()) {
        return { id: data.id };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getAudioDuration(filePath: string): Promise<number | undefined> {
  try {
    const metadata = await parseFile(filePath);
    return metadata.format.duration;
  } catch {
    return undefined;
  }
}

function parseTimestampFromFilename(filename: string): string {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return new Date().toISOString();
  }
  
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ).toISOString();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const { month } = await params;
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const baseDir = getBasePath(VOICE_MEMOS_DIR, month);

    const TRANSCRIPTS_DIR = path.join(baseDir, 'transcripts');
    const SUMMARIES_DIR = path.join(baseDir, 'summaries');
    const TODOS_DIR = path.join(baseDir, 'TODOs');
    const TITLES_DIR = path.join(baseDir, 'titles');
    const BLOSSOMS_DIR = path.join(baseDir, 'blossoms');
    const YOLOPOSTS_DIR = path.join(baseDir, 'yoloposts');

    // Get all audio files
    let audioFiles: string[];
    try {
      audioFiles = (await fs.readdir(baseDir)).filter(file => file.endsWith('.m4a'));
    } catch {
      return NextResponse.json([]);
    }

    // Process each audio file
    const memos = await Promise.all(
      audioFiles.map(async (audioFile) => {
        const baseFilename = path.basename(audioFile, '.m4a');
        const audioPath = path.join(baseDir, audioFile);
        
        const [transcript, originalTranscript, summary, todos, title, blossomData, yolopostData, duration] = await Promise.all([
          readFileIfExists(path.join(TRANSCRIPTS_DIR, `${baseFilename}.txt`)),
          readFileIfExists(path.join(TRANSCRIPTS_DIR, `${baseFilename}.txt.orig`)),
          readFileIfExists(path.join(SUMMARIES_DIR, `${baseFilename}.txt`)),
          readFileIfExists(path.join(TODOS_DIR, `${baseFilename}.md`)),
          readFileIfExists(path.join(TITLES_DIR, `${baseFilename}.txt`)),
          readBlossomDataIfExists(path.join(BLOSSOMS_DIR, `${baseFilename}.json`)),
          readYoloPostDataIfExists(path.join(YOLOPOSTS_DIR, `${baseFilename}.json`)),
          getAudioDuration(audioPath)
        ]);

        const isCleanedTranscript = !!originalTranscript;

        const memo: Memo = {
          filename: baseFilename,
          transcript,
          isCleanedTranscript,
          summary,
          todos,
          title: title.trim() || undefined,
          path: path.join(TODOS_DIR, `${baseFilename}.md`),
          createdAt: parseTimestampFromFilename(baseFilename),
          audioUrl: buildAudioUrl(baseFilename),
          archivePath: month,
          blossom: blossomData || undefined,
          yolopost: yolopostData || undefined,
          duration
        };

        return memo;
      })
    );

    // Sort by filename descending (newest first)
    memos.sort((a, b) => b.filename.localeCompare(a.filename));

    // Read monthly summary if it exists
    const monthlySummary = await readFileIfExists(path.join(baseDir, 'MONTHLY_SUMMARY.md'));

    const response: ArchiveMonthResponse = {
      memos,
      monthlySummary: monthlySummary || undefined
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching archive memos:', error);
    return NextResponse.json({ error: 'Failed to fetch archive memos' }, { status: 500 });
  }
}

