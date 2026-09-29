import path from 'path';

// npm --prefix ui runs from ui/. Relative overrides are relative to that directory.
export function getVoiceMemosDir(): string {
  return path.resolve(process.env.VOICE_MEMOS_DIR || path.join('..', 'VoiceMemos'));
}
