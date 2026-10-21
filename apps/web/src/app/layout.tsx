import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '../components/AppShell';


export const metadata: Metadata = {
  metadataBase: new URL('https://playverzus.xyz'),
  title: 'Playverzus.xyz — Competitive Esports Platform',
  description: 'Skill-based esports matchmaking, party duels, and tournaments with automated instant match verification and anti-cheat.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Playverzus.xyz — Competitive Esports Platform',
    description: 'Skill-based esports matchmaking, party duels, and tournaments with automated instant match verification.',
    url: 'https://playverzus.xyz',
    siteName: 'Playverzus.xyz',
    images: [
      {
        url: '/images/logo.png',
        width: 770,
        height: 148,
        alt: 'Playverzus.xyz',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Playverzus.xyz — Competitive Esports Platform',
    description: 'Skill-based esports matchmaking, party duels, and tournaments with automated instant match verification.',
    images: ['/images/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0B0C10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex font-sans selection:bg-primary selection:text-white overflow-x-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
