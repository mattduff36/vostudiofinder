import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { HomePage } from '@/components/home/HomePage';
import { getBaseUrl, SITE_NAME, SITE_NAME_ALT, SITE_TAGLINE, SITE_DESCRIPTION, SITE_KEYWORDS, TWITTER_HANDLE } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: `${SITE_NAME} - Find Professional Recording Studios`,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    url: getBaseUrl(),
    images: [
      {
        url: `${getBaseUrl()}/images/homepage.jpg`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Find Professional Recording Studios`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_TAGLINE,
    site: TWITTER_HANDLE,
    images: [`${getBaseUrl()}/images/homepage.jpg`],
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  let featuredStudiosRaw: any[] = [];
  
  try {
    // Fetch featured studios for the homepage (available to all users)
    // Only show studios where user_profiles.is_featured === true AND is_profile_visible === true, limited to 6
    featuredStudiosRaw = await db.studio_profiles.findMany({
      where: {
        status: 'ACTIVE',
        is_featured: true,
        is_profile_visible: true,
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
      take: 6, // Maximum of 6 featured studios
    });
  } catch (error) {
    console.error('Error fetching featured studios:', error);
    // Continue with empty array - homepage will show placeholder cards
  }

  // Always pin VoiceoverGuy studio first, then randomize the rest
  const voiceoverGuy = featuredStudiosRaw.find(
    studio => studio.users?.username === 'VoiceoverGuy'
  );
  const otherStudios = featuredStudiosRaw.filter(
    studio => studio.users?.username !== 'VoiceoverGuy'
  );
  
  // Randomize other studios and take up to 5 (to make room for VoiceoverGuy)
  const randomizedOthers = otherStudios
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
  
  // Put VoiceoverGuy first if exists, then add the rest
  const featuredStudios = voiceoverGuy 
    ? [voiceoverGuy, ...randomizedOthers]
    : randomizedOthers.slice(0, 6);

  // Get total counts for stats with error handling
  let totalStudios = 0;
  let totalUsers = 0;
  let uniqueCountries = 0;
  
  try {
    [totalStudios, totalUsers, uniqueCountries] = await Promise.all([
      db.studio_profiles.count({ where: { status: 'ACTIVE' } }),
      db.users.count(),
      // Count unique countries from user_profiles.location
      db.studio_profiles.findMany({
        select: { location: true },
        where: { location: { not: null } }
      }).then(profiles => {
        const uniqueLocations = new Set(
          profiles
            .map(p => p.location?.trim())
            .filter((loc): loc is string => !!loc && loc.length > 0)
        );
        return uniqueLocations.size;
      })
    ]);
  } catch (error) {
    console.error('Error fetching homepage stats:', error);
    // Continue with default values
  }

  // Convert Decimal fields to numbers and map short_about to description for client components
  const serializedStudios = featuredStudios.map(studio => ({
    ...studio,
    description: studio.short_about || '', // Use short_about as description
    latitude: studio.latitude ? Number(studio.latitude) : null,
    longitude: studio.longitude ? Number(studio.longitude) : null,
    owner: studio.users ? { 
      username: studio.users.username,
      display_name: studio.users.display_name,
      avatar_url: studio.users.avatar_url,
    } : undefined, // Map users to owner for component with avatar
    location: studio.location || '', // Keep location for backward compatibility
    city: studio.city || '', // Add city field for display
    address: studio.full_address || '', // Ensure address is available
    // Pass studio_images directly with snake_case
    studio_images: studio.studio_images?.map((img: any) => ({
      image_url: img.image_url,
      alt_text: img.alt_text,
    })) || [],
  }));

  // WebSite structured data for Google site name recognition
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
      {/* WebSite structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
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

