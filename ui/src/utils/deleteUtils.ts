import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Deletes the corresponding action_item file when TODOs are being deleted
 * @param voiceMemosDir - The VoiceMemos directory path
 * @param baseFilename - The base filename (without extension)
 * @returns Promise<string | null> - The deleted file path or null if not found
 */
export async function deleteActionItemFile(
  voiceMemosDir: string, 
  baseFilename: string
): Promise<string | null> {
  const actionItemsDir = path.join(voiceMemosDir, 'action_items');
  const actionItemPath = path.join(actionItemsDir, `${baseFilename}.txt`);
  
  if (existsSync(actionItemPath)) {
    await fs.unlink(actionItemPath);
    console.log(`Also deleted action_item file: ${actionItemPath}`);
    return path.relative(voiceMemosDir, actionItemPath);
  }
  
  return null;
}
