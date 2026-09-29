import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
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
  blossom?: {
    url: string;
    sha256: string;
    size: number;
    type: string;
    uploaded: number;
  };
  yolopost?: {
    id: string;
  };
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
  // Extract YYYYMMDD_HHMMSS from the filename
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
  if (!match) {
    return new Date().toISOString(); // Fallback to current time if pattern doesn't match
  }
  
  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    parseInt(year),
    parseInt(month) - 1, // JavaScript months are 0-based
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  ).toISOString();
}

async function getMemosFromDir(voiceMemosDir: string, archivePath?: string): Promise<Memo[]> {
  const baseDir = getBasePath(voiceMemosDir, archivePath);
  
  const TRANSCRIPTS_DIR = path.join(baseDir, 'transcripts');
  const SUMMARIES_DIR = path.join(baseDir, 'summaries');
  const TODOS_DIR = path.join(baseDir, 'TODOs');
  const TITLES_DIR = path.join(baseDir, 'titles');
  const BLOSSOMS_DIR = path.join(baseDir, 'blossoms');
  const YOLOPOSTS_DIR = path.join(baseDir, 'yoloposts');

  // Get all audio files from the directory
  let audioFiles: string[];
  try {
    audioFiles = (await fs.readdir(baseDir))
      .filter(file => file.endsWith('.m4a'));
  } catch {
    return []; // Directory doesn't exist or can't be read
  }

  // Process each audio file and gather related content
  const memos = await Promise.all(
    audioFiles.map(async (audioFile) => {
      const baseFilename = path.basename(audioFile, '.m4a');
      
      // Get content from each plugin directory
      // Check for cleaned transcript (main .txt file) and original (.txt.orig file)
      const [transcript, originalTranscript, summary, todos, title, blossomData, yolopostData] = await Promise.all([
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

      const memo: Memo = {
        filename: baseFilename,
        transcript,
        isCleanedTranscript,
        summary,
        todos,
        title: title.trim() || undefined,
        path: path.join(TODOS_DIR, `${baseFilename}.md`), // Keep the TODOs path for editing
        createdAt: parseTimestampFromFilename(baseFilename),
        audioUrl: buildAudioUrl(baseFilename),
        archivePath,
        blossom: blossomData || undefined,
        yolopost: yolopostData || undefined
      };

      return memo;
    })
  );

  return memos;
}

export async function GET() {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const ARCHIVE_DIR = path.join(VOICE_MEMOS_DIR, 'archive');

    // Ensure default directories exist for root
    await Promise.all([
      fs.mkdir(path.join(VOICE_MEMOS_DIR, 'transcripts'), { recursive: true }),
      fs.mkdir(path.join(VOICE_MEMOS_DIR, 'summaries'), { recursive: true }),
      fs.mkdir(path.join(VOICE_MEMOS_DIR, 'TODOs'), { recursive: true })
    ]);

    // Get current (non-archived) memos
    const currentMemos = await getMemosFromDir(VOICE_MEMOS_DIR);

    // Get archived memos from all archive folders
    let archivedMemos: Memo[] = [];
    try {
      const archiveFolders = await fs.readdir(ARCHIVE_DIR);
      const archiveResults = await Promise.all(
        archiveFolders.map(folder => getMemosFromDir(VOICE_MEMOS_DIR, folder))
      );
      archivedMemos = archiveResults.flat();
    } catch {
      // Archive directory doesn't exist yet, that's fine
    }

    const allMemos = [...currentMemos, ...archivedMemos];

    // Sort by creation date (newest first)
    allMemos.sort((a, b) => b.filename.localeCompare(a.filename));

    return NextResponse.json(allMemos);
  } catch (error) {
    console.error('Error processing memos:', error);
    return NextResponse.json({ error: 'Failed to process memos' }, { status: 500 });
  }
}
