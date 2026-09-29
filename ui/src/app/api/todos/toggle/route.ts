import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { filePath, lineNumber, completed } = await request.json();
    
    if (!filePath) {
      throw new Error('filePath is required');
    }
    
    // Extract filename from filePath (e.g., "TODOs/20251203_143022.md" -> "20251203_143022")
    const filename = path.basename(filePath, path.extname(filePath));
    
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    
    // Auto-detect location by convention
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, filename);
    
    // Read the file using the real path
    const fullPath = path.join(baseDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Update the specific line
    if (lineNumber >= 0 && lineNumber < lines.length) {
      const line = lines[lineNumber];
      const match = line.match(/^(\s*-\s*\[)[ x](\]\s*.*)/);
      if (match) {
        lines[lineNumber] = `${match[1]}${completed ? 'x' : ' '}${match[2]}`;
        await fs.writeFile(fullPath, lines.join('\n'));
        return NextResponse.json({ success: true });
      }
    }

    throw new Error('Invalid line number or line format');
  } catch (error) {
    console.error('Error toggling todo:', error);
    return NextResponse.json(
      { error: 'Failed to toggle todo' },
      { status: 500 }
    );
  }
}