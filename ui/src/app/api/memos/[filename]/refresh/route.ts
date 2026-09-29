import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { deleteActionItemFile } from '@/utils/deleteUtils';
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
    
    // Use glob to find all files matching the pattern
    const pattern = path.join(baseDir, '**', `${baseFilename}.*`);
    const files = await glob(pattern, { nodir: true });
    
    // Filter out the audio file - NEVER delete the audio file
    const filesToDelete = files.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return ext !== '.m4a' && ext !== '.mp3' && ext !== '.wav' && ext !== '.aac';
    });
    
    // Delete all matching files (excluding audio)
    const deletedFiles: string[] = [];
    const errors: string[] = [];
    
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
        deletedFiles.push(path.relative(baseDir, filePath));
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
        errors.push(path.relative(baseDir, filePath));
      }
    }
    
    // Special handling for TODOs: also delete the corresponding action_item file
    // Check if any of the deleted files were from the TODOs directory
    const deletedTodosFiles = deletedFiles.filter(file => file.startsWith('TODOs/'));
    if (deletedTodosFiles.length > 0) {
      const deletedActionItemPath = await deleteActionItemFile(baseDir, baseFilename);
      if (deletedActionItemPath) {
        deletedFiles.push(deletedActionItemPath);
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
    console.error('Error refreshing memo:', error);
    return NextResponse.json(
      { error: 'Failed to refresh memo' },
      { status: 500 }
    );
  }
}
