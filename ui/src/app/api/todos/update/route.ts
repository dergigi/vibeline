import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { filename, content } = await request.json();
    
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }
    
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, filename);
    const TODOS_DIR = path.join(baseDir, 'TODOs');
    
    // Construct the todo file path
    const todoFilePath = path.join(TODOS_DIR, `${filename}.md`);
    
    // Security check: ensure the file is within the TODOs directory
    const normalizedPath = path.normalize(todoFilePath);
    if (!normalizedPath.startsWith(TODOS_DIR)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    // Write the new content to the file ("TODOs cleared" if content is empty)
    const fileContent = content?.trim() || 'TODOs cleared';
    await fs.writeFile(todoFilePath, fileContent);
    
    return NextResponse.json({ 
      success: true,
      filename,
      content: fileContent
    });
  } catch (error) {
    console.error('Error updating todos:', error);
    return NextResponse.json(
      { error: 'Failed to update todos' },
      { status: 500 }
    );
  }
}
