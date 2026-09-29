import Link from 'next/link';

async function getPlugins() {
  const port = process.env.PORT || '555';
  const response = await fetch(
    new URL('/api/plugins', typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.host : `http://localhost:${port}`),
    { cache: 'no-store' }
  );
  return response.json();
}

export default async function PluginsPage() {
  const plugins = await getPlugins();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plugins</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse and manage your voice memo plugins
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plugins.map((plugin: { id: string; name: string; path: string }) => (
            <Link
              key={plugin.id}
              href={plugin.path}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {plugin.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                View {plugin.name.toLowerCase()} content
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
} 