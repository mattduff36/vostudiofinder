import { Metadata } from 'next';
import { getBaseUrl, SITE_NAME, TWITTER_HANDLE } from '@/lib/seo/site';

interface PublicPageMetadataOptions {
  title: string;
  description: string;
  pathname: string;
}

interface NoIndexMetadataOptions {
  title: string;
  description?: string;
}

function buildAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname === '/' ? '' : pathname;
  return `${getBaseUrl()}${normalizedPath}`;
}

export function buildPublicPageMetadata({
  title,
  description,
  pathname,
}: PublicPageMetadataOptions): Metadata {
  const pageUrl = buildAbsoluteUrl(pathname);

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: pageUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: TWITTER_HANDLE,
    },
  };
}

export function buildNoIndexMetadata({
  title,
  description,
}: NoIndexMetadataOptions): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        'max-video-preview': -1,
        'max-image-preview': 'none',
        'max-snippet': 0,
      },
    },
  };
}
