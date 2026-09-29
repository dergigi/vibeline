import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { Navigation } from '@/components/Navigation';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Vibeline',
    template: '%s | Vibeline'
  },
  description: 'Call 555-vibe to vibe it into existence 🤙',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${jetbrainsMono.className} antialiased`}>
        <Navigation />
        {children}
      </body>
    </html>
  );
} 