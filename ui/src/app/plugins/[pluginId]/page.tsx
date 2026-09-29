import { getVoiceMemosDir } from '@/lib/dataPaths';
import { Suspense } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import { existsSync } from 'fs';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { Metadata } from 'next';

const VOICE_MEMOS_DIR = getVoiceMemosDir();
const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins');

interface PluginFile {
  name: string;
  path: string;
  content?: string;
  mimeType?: string;
  transcript?: string;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function FileContent({ file }: { file: PluginFile }) {
  const mimeType = file.mimeType || getMimeType(file.name);

  if (!file.content) {
    return <p className="text-gray-500 dark:text-gray-400">No content available</p>;
  }

  if (mimeType.startsWith('image/')) {
    return (
      <div className="relative w-full h-64">
        <Image
          src={`/api/files/${file.path}`}
          alt={file.name}
          fill
          className="object-contain"
        />
      </div>
    );
  }

  if (mimeType.startsWith('audio/')) {
    return (
      <audio controls className="w-full">
        <source src={`/api/files/${file.path}`} type={mimeType} />
        Your browser does not support the audio element.
      </audio>
    );
  }

  if (mimeType.startsWith('video/')) {
    return (
      <video controls className="w-full">
        <source src={`/api/files/${file.path}`} type={mimeType} />
        Your browser does not support the video element.
      </video>
    );
  }

  if (mimeType === 'application/json') {
    try {
      const formattedJson = JSON.stringify(JSON.parse(file.content), null, 2);
      return (
        <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded overflow-auto">
          <code>{formattedJson}</code>
        </pre>
      );
    } catch {
      return <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded overflow-auto">{file.content}</pre>;
    }
  }

  if (mimeType === 'text/markdown') {
    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded overflow-auto prose dark:prose-invert max-w-none">
        {file.content}
      </div>
    );
  }

  // Default text display
  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded overflow-auto">
      <div className="whitespace-pre-wrap break-words max-w-3xl">
        {file.content}
      </div>
    </div>
  );
}

async function getPluginContent(pluginId: string): Promise<{ files: PluginFile[]; hasCustomUI: boolean }> {
  // Resolve the symlink to get the actual path
  const resolvedVoiceMemosDir = await fs.realpath(VOICE_MEMOS_DIR);
  const pluginDir = path.join(resolvedVoiceMemosDir, pluginId);
  const customUIPath = path.join(PLUGINS_DIR, `${pluginId}.tsx`);
  
  // Create the plugin directory if it doesn't exist
  if (!existsSync(pluginDir)) {
    await fs.mkdir(pluginDir, { recursive: true });
  }

  // Check if the custom UI exists
  const hasCustomUI = existsSync(customUIPath);

  try {
    const entries = await fs.readdir(pluginDir, { withFileTypes: true });
    
    const filePromises = entries
      .filter(entry => entry.isFile())
      .map(async entry => {
        const filePath = path.join(pluginDir, entry.name);
        let content: string | undefined;
        let transcript: string | undefined;

        try {
          content = await fs.readFile(filePath, 'utf-8');
          
          // Try to read matching transcript file from the root transcripts directory
          const resolvedTranscriptsDir = path.join(resolvedVoiceMemosDir, 'transcripts');
          const transcriptPath = path.join(resolvedTranscriptsDir, entry.name.replace(/\.[^/.]+$/, '.txt'));
          if (existsSync(transcriptPath)) {
            transcript = await fs.readFile(transcriptPath, 'utf-8');
          }
        } catch (error) {
          console.error(`Error reading file ${filePath}:`, error);
        }

        return {
          name: entry.name,
          path: path.join(pluginId, entry.name),
          content,
          transcript,
          mimeType: getMimeType(entry.name)
        };
      });

    const files = await Promise.all(filePromises);
    return { files, hasCustomUI };
  } catch (error) {
    console.error(`Error reading plugin ${pluginId}:`, error);
    return { files: [], hasCustomUI };
  }
}

function DefaultPluginUI({ files, pluginId }: { files: PluginFile[]; pluginId: string }) {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
          {pluginId.replace(/_/g, ' ')}
        </h1>
      </div>
      {files.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            No files found in this plugin directory yet.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Voice memos that generate {pluginId.toLowerCase()} content will appear here.
          </p>
        </div>
      ) : (
        files.map((file) => (
          <div
            key={file.path}
            className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {file.name}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {file.mimeType}
              </span>
            </div>
            <FileContent file={file} />
          </div>
        ))
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ pluginId: string }> }): Promise<Metadata> {
  const { pluginId } = await params;
  
  // Format the plugin ID for display (capitalize and replace underscores with spaces)
  const formattedTitle = pluginId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return {
    title: formattedTitle,
  };
}

export default async function PluginPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await params;
  const { files, hasCustomUI } = await getPluginContent(pluginId);
  
  // Only show 404 if the plugin directory doesn't exist at all
  const pluginDir = path.join(VOICE_MEMOS_DIR, pluginId);
  if (!existsSync(pluginDir)) {
    notFound();
  }

  if (hasCustomUI) {
    const CustomUI = dynamic<{ files: PluginFile[] }>(() => import(`@/plugins/${pluginId}`), {
      loading: () => <div>Loading custom plugin UI...</div>
    });

    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Suspense fallback={<div>Loading...</div>}>
            <CustomUI files={files} />
          </Suspense>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <DefaultPluginUI files={files} pluginId={pluginId} />
        </Suspense>
      </div>
    </main>
  );
} 