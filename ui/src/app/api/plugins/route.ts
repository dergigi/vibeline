import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { RESERVED_DIRS } from '@/lib/constants';

export async function GET(): Promise<NextResponse> {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    const entries = await fs.readdir(VOICE_MEMOS_DIR, { withFileTypes: true });
    const plugins = entries
      .filter(entry => 
        entry.isDirectory() && 
        !entry.name.startsWith('.') &&
        !RESERVED_DIRS.includes(entry.name)
      )
      .map(entry => ({
        id: entry.name,
        name: entry.name.charAt(0).toUpperCase() + entry.name.slice(1).replace(/_/g, ' '),
        path: `/plugins/${entry.name}`
      }));

    return NextResponse.json(plugins);
  } catch (error) {
    console.error('Error reading plugins:', error);
    return NextResponse.json([], { status: 500 });
  }
} 
