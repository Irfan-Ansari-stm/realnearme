import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: { default: 'NearMe — Discover Places Around You', template: '%s | NearMe' },
  description: 'Discover hidden gems, cafés, parks, and vibrant spots near you.',
  keywords: ['places', 'discovery', 'local', 'map', 'cafes', 'restaurants', 'hidden gems'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-0 text-surface-900 font-body antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: { background: '#1a1a1a', color: '#f5f5f5', border: '1px solid #2e2e2e', fontSize: '14px' },
              success: { iconTheme: { primary: '#f97316', secondary: '#1a1a1a' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a1a' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
