import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { text, pluginId } = await request.json();
    
    // Create the TODOs directory if it doesn't exist
    const todosDir = path.join(getVoiceMemosDir(), pluginId);
    await fs.mkdir(todosDir, { recursive: true });

    // Create a new file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').split('T')[0];
    const fileName = `${timestamp}_${Date.now()}.md`;
    const filePath = path.join(todosDir, fileName);

    // Write the todo in markdown format
    await fs.writeFile(filePath, `- [ ] ${text}\n`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding todo:', error);
    return NextResponse.json(
      { error: 'Failed to add todo' },
      { status: 500 }
    );
  }
} 