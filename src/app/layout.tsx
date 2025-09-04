import type { Metadata } from 'next';
import { Geist, Geist_Mono, Raleway } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { authOptions } from '@/lib/auth';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'VoiceoverStudioFinder - Find Professional Recording Studios',
  description: 'Browse professional voiceover recording studios worldwide - no signup required! Find studios, read reviews, and contact directly. Studio owners can list for £25/year.',
  keywords: 'voiceover, recording studio, audio production, voice talent, studio rental',
  authors: [{ name: 'VoiceoverStudioFinder Team' }],
  openGraph: {
    title: 'VoiceoverStudioFinder',
    description: 'Browse professional voiceover recording studios worldwide - no signup required!',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceoverStudioFinder',
    description: 'Browse professional voiceover recording studios worldwide - no signup required!',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable} antialiased`}
      >
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
