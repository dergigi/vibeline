import { getVoiceMemosDir } from '@/lib/dataPaths';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { deleteActionItemFile } from '@/utils/deleteUtils';
import { findMemoBaseDir } from '@/lib/archivePaths';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Resolve the symlink to get the actual path
    const VOICE_MEMOS_DIR = await fs.realpath(getVoiceMemosDir());
    
    const { filename, plugin } = await request.json();
    
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }
    
    if (!plugin) {
      return new NextResponse('Plugin name is required', { status: 400 });
    }

    // Get the base filename without extension
    const baseFilename = path.basename(filename, path.extname(filename));

    // Auto-detect location by convention
    const baseDir = findMemoBaseDir(VOICE_MEMOS_DIR, baseFilename);
    
    // Construct the plugin directory path (normalize common alias 'todos' -> 'TODOs')
    const normalizedPlugin = plugin === 'todos' ? 'TODOs' : plugin;
    const pluginDir = path.join(baseDir, normalizedPlugin);
    
    // Check if the plugin directory exists
    if (!existsSync(pluginDir)) {
      return NextResponse.json(
        { error: `Plugin directory '${normalizedPlugin}' does not exist` },
        { status: 404 }
      );
    }
    
    // Read all files in the plugin directory
    const files = await fs.readdir(pluginDir);
    
    // Find all files that match the base filename (regardless of extension)
    const filesToDelete = files.filter(file => {
      const fileBaseName = path.basename(file, path.extname(file));
      return fileBaseName === baseFilename;
    });

    // Delete all matching files
    await Promise.all(
      filesToDelete.map(async (file) => {
        const filePath = path.join(pluginDir, file);
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      })
    );

    // Special handling for TODOs: also delete the corresponding action_item file
    if (normalizedPlugin === 'TODOs') {
      await deleteActionItemFile(baseDir, baseFilename);
    }

    return NextResponse.json({ 
      success: true, 
      deletedFiles: filesToDelete,
      plugin
    });
  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 }
    );
  }
} 