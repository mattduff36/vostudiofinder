import type { Metadata } from 'next';
import { Geist, Geist_Mono, Raleway } from 'next/font/google';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Navbar } from '@/components/navigation/Navbar';
import { MobileShell } from '@/components/navigation/MobileShell';
import { CookieConsentBanner } from '@/components/consent/CookieConsentBanner';
import { DynamicAnalytics } from '@/components/consent/DynamicAnalytics';
import { GlobalEditProfileModal } from '@/components/profile/GlobalEditProfileModal';
import { authOptions } from '@/lib/auth';
import Script from 'next/script';
import { getBaseUrl, SITE_NAME } from '@/lib/seo/site';
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
  metadataBase: new URL(getBaseUrl()),
  title: `${SITE_NAME} - Find Professional Recording Studios`,
  description:
    'Browse professional voiceover recording studios worldwide - no signup required! Find studios, read reviews, and contact directly. Studio owners can list for £25/year.',
  keywords: 'voiceover, recording studio, audio production, voice talent, studio rental',
  authors: [{ name: `${SITE_NAME} Team` }],
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'manifest', url: '/favicon/site.webmanifest' }],
  },
  openGraph: {
    title: SITE_NAME,
    description: 'Browse professional voiceover recording studios worldwide - no signup required!',
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: 'Browse professional voiceover recording studios worldwide - no signup required!',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  let consentLevel: 'all' | 'necessary' | 'decline' | undefined;
  try {
    const cookieStore = await cookies();
    const consentCookie = cookieStore.get('vsf_cookie_consent');
    consentLevel = consentCookie?.value as 'all' | 'necessary' | 'decline' | undefined;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    consentLevel = undefined;
  }

  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover"
        />
        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable} antialiased`}>
        <SessionProvider session={session}>
          <LoadingProvider>
            <ToastProvider />
            <ConfirmDialog />
            <GlobalEditProfileModal />
            <Navbar session={session} />
            <main className="pt-16 pb-40 md:pt-20 md:pb-0">{children}</main>
            <MobileShell session={session} />
          </LoadingProvider>
        </SessionProvider>
        <DynamicAnalytics />
        <CookieConsentBanner initialLevel={consentLevel || null} />
      </body>
    </html>
  );
}
