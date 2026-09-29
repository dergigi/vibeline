import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { filename, title } = await request.json();
    
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }
    
    if (!title) {
      return new NextResponse('Title is required', { status: 400 });
    }
    
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, filename);
    const TITLES_DIR = path.join(baseDir, 'titles');
    
    // Construct the title file path
    const titleFilePath = path.join(TITLES_DIR, `${filename}.txt`);
    
    // Security check: ensure the file is within the titles directory
    const normalizedPath = path.normalize(titleFilePath);
    if (!normalizedPath.startsWith(TITLES_DIR)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    // Write the new title to the file
    await fs.writeFile(titleFilePath, title.trim());
    
    return NextResponse.json({ 
      success: true,
      filename,
      title: title.trim()
    });
  } catch (error) {
    console.error('Error updating title:', error);
    return NextResponse.json(
      { error: 'Failed to update title' },
      { status: 500 }
    );
  }
}
