import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    
    const { filename } = await params;
    const baseFilename = filename;
    
    // Auto-detect location by convention
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, baseFilename);
    
    // Use glob to find ALL files matching the pattern (including audio)
    const pattern = path.join(baseDir, '**', `${baseFilename}.*`);
    const files = await glob(pattern, { nodir: true });
    
    // Delete ALL matching files (including audio files)
    const deletedFiles: string[] = [];
    const errors: string[] = [];
    
    for (const filePath of files) {
      try {
        await fs.unlink(filePath);
        deletedFiles.push(path.relative(baseDir, filePath));
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        errors.push(path.relative(baseDir, filePath));
      }
    }
    
    return NextResponse.json({
      success: true,
      filename: baseFilename,
      deletedFiles,
      totalDeleted: deletedFiles.length,
      errors,
      totalErrors: errors.length
    });
  } catch (error) {
    console.error('Error deleting memo:', error);
    return NextResponse.json(
      { error: 'Failed to delete memo' },
      { status: 500 }
    );
  }
}
