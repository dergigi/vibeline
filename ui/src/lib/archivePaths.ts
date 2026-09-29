import path from 'path';
import { existsSync } from 'fs';

/**
 * Derive the archive month from a filename following YYYYMMDD_HHMMSS convention.
 * @param filename - The memo filename (e.g., "20251203_143022")
 * @returns Archive folder name like "2025-12" or undefined if invalid format
 */
export function getArchiveMonthFromFilename(filename: string): string | undefined {
  const match = filename.match(/^(\d{4})(\d{2})/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}

/**
 * Auto-locate a memo's base directory by convention.
 * Checks main directory first, then derives archive location from filename.
 * @param voiceMemosDir - The root VoiceMemos directory path
 * @param filename - The memo filename (without extension)
 * @returns The base directory where the memo files are located
 */
export function findMemoBaseDir(voiceMemosDir: string, filename: string): string {
  // Convention 1: Check main directory first (current/active memos)
  const mainAudioPath = path.join(voiceMemosDir, `${filename}.m4a`);
  if (existsSync(mainAudioPath)) {
    return voiceMemosDir;
  }
  
  // Convention 2: Derive archive location from filename date
  const archiveMonth = getArchiveMonthFromFilename(filename);
  if (archiveMonth) {
    const archiveDir = path.join(voiceMemosDir, 'archive', archiveMonth);
    const archiveAudioPath = path.join(archiveDir, `${filename}.m4a`);
    if (existsSync(archiveAudioPath)) {
      return archiveDir;
    }
  }
  
  // Fallback to main directory
  return voiceMemosDir;
}

/**
 * Get the base path for a memo's files, accounting for archive structure.
 * @deprecated Use findMemoBaseDir() for convention-based auto-detection
 * @param voiceMemosDir - The root VoiceMemos directory path
 * @param archivePath - Optional archive folder name (e.g., "2025-12")
 * @returns The base path where memo files are located
 */
export function getBasePath(voiceMemosDir: string, archivePath?: string): string {
  return archivePath 
    ? path.join(voiceMemosDir, 'archive', archivePath)
    : voiceMemosDir;
}

/**
 * Build the audio URL for a memo.
 * @param baseFilename - The memo's base filename (without extension)
 * @returns The audio URL path
 */
export function buildAudioUrl(baseFilename: string): string {
  return `/api/audio/${baseFilename}.m4a`;
}

