import { VoiceMemo } from '@/types/VoiceMemo';

interface ApiVoiceMemo extends Omit<VoiceMemo, 'createdAt'> {
  createdAt: string;
}

export async function getVoiceMemos(): Promise<VoiceMemo[]> {
  try {
    const response = await fetch('/api/memos');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const memos = await response.json() as ApiVoiceMemo[];
    return memos.map((memo) => ({
      ...memo,
      createdAt: new Date(memo.createdAt)
    }));
  } catch (err) {
    console.error('Error fetching voice memos:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
} 