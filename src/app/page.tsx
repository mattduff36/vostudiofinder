import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { HomePage } from '@/components/home/HomePage';
import {
  getBaseUrl,
  SITE_NAME,
  SITE_NAME_ALT,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  TWITTER_HANDLE,
} from '@/lib/seo/site';

const HOME_TITLE = 'Voiceover Studio Finder | Voiceover & Podcast Recording Studios';
const HOME_DESCRIPTION = 'Discover professional voiceover and podcast studios near you. Find Audio Producers and Pro Voiceover Coaches with Recording Studios Worldwide.';

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    url: getBaseUrl(),
    images: [
      {
        url: `${getBaseUrl()}/images/homepage.jpg`,
        width: 1200,
        height: 630,
        alt: HOME_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    site: TWITTER_HANDLE,
    images: [`${getBaseUrl()}/images/homepage.jpg`],
  },
};

// Cache homepage for 10 minutes (600 seconds)
export const revalidate = 600;

export default async function Home() {
  const session = await getServerSession(authOptions);

  let featuredStudiosRaw: any[] = [];

  try {
    const now = new Date();
    featuredStudiosRaw = await db.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
        is_featured: true,
        is_profile_visible: true,
        OR: [
          { featured_until: null },
          { featured_until: { gte: now } }
        ]
      },
      include: {
        users: {
          select: {
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
        studio_services: true,
        studio_studio_types: {
          select: {
            studio_type: true,
          },
        },
        studio_images: {
          take: 1,
          orderBy: { sort_order: 'asc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
      take: 6,
    });
  } catch (error) {
    console.error('Error fetching featured studios:', error);
  }

  const voiceoverGuy = featuredStudiosRaw.find((studio) => studio.users?.username === 'VoiceoverGuy');
  const otherStudios = featuredStudiosRaw.filter((studio) => studio.users?.username !== 'VoiceoverGuy');

  const randomizedOthers = otherStudios.sort(() => Math.random() - 0.5).slice(0, 5);

  const featuredStudios = voiceoverGuy ? [voiceoverGuy, ...randomizedOthers] : randomizedOthers.slice(0, 6);

  let totalStudios = 0;
  let totalUsers = 0;
  let uniqueCountries = 0;

  try {
    [totalStudios, totalUsers, uniqueCountries] = await Promise.all([
      db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
      db.users.count(),
      db.studio_profiles
        .findMany({
          select: { location: true },
          where: { location: { not: null } },
        })
        .then((profiles) => {
          const uniqueLocations = new Set(
            profiles.map((p) => p.location?.trim()).filter((loc): loc is string => !!loc && loc.length > 0)
          );
          return uniqueLocations.size;
        }),
    ]);
  } catch (error) {
    console.error('Error fetching homepage stats:', error);
  }

  const serializedStudios = featuredStudios.map((studio) => ({
    ...studio,
    description: studio.short_about || '',
    latitude: studio.latitude ? Number(studio.latitude) : null,
    longitude: studio.longitude ? Number(studio.longitude) : null,
    owner: studio.users
      ? {
          username: studio.users.username,
          display_name: studio.users.display_name,
          avatar_url: studio.users.avatar_url,
        }
      : undefined,
    location: studio.location || '',
    city: studio.city || '',
    address: studio.full_address || '',
    studio_images:
      studio.studio_images?.map((img: any) => ({
        image_url: img.image_url,
        alt_text: img.alt_text,
      })) || [],
  }));

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_NAME_ALT,
    url: getBaseUrl(),
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getBaseUrl()}/studios?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <HomePage
        session={session}
        featuredStudios={serializedStudios}
        stats={{
          totalStudios,
          totalUsers,
          totalCountries: uniqueCountries,
        }}
      />
    </>
  );
}

