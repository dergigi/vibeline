import { notFound } from 'next/navigation';
import Link from 'next/link';
import { VoiceMemoCard } from '@/components/VoiceMemoCard';
import { SearchProvider } from '@/contexts/SearchContext';
import type { Metadata } from 'next';

async function getMemo(filename: string, archivePath?: string) {
  const port = process.env.PORT || '555';
  const url = new URL(
    `/api/memos/${filename}`,
    typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : `http://localhost:${port}`
  );
  
  if (archivePath) {
    url.searchParams.set('archive', archivePath);
  }
  
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

interface PageProps {
  params: Promise<{ filename: string }>;
  searchParams: Promise<{ archive?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { filename } = await params;
  const { archive } = await searchParams;
  const memo = await getMemo(filename, archive);

  if (!memo) {
    return {
      title: 'Memo Not Found',
    };
  }

  const title = memo.title || filename;
  return {
    title: title,
  };
}

export default async function MemoPage({ params, searchParams }: PageProps) {
  const { filename } = await params;
  const { archive } = await searchParams;
  const memo = await getMemo(filename, archive);

  if (!memo) {
    notFound();
  }

  // Determine back link based on whether it's an archived memo
  const backHref = archive ? `/archive/${archive}` : '/';
  const backText = archive ? `← Back to ${archive}` : '← Back to all memos';

  return (
    <SearchProvider isArchiveView={!!archive}>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Link
              href={backHref}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              {backText}
            </Link>
          </div>
          <VoiceMemoCard memo={memo} isMemoPage={true} />
        </div>
      </main>
    </SearchProvider>
  );
}
