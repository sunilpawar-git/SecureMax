import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { APP } from '@/config/strings';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP.NAME,
  description: APP.DESCRIPTION,
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <meta name="theme-color" content="#047857" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
