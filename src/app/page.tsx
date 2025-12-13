import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: 'VoiceoverStudioFinder - Find Professional Recording Studios',
  description: 'Connect with professional voiceover recording studios worldwide. Find the perfect studio for your next project with advanced search and location features.',
  keywords: 'voiceover, recording studio, audio production, voice talent, studio rental, ISDN, Source Connect',
  openGraph: {
    title: 'VoiceoverStudioFinder',
    description: 'Find Professional Recording Studios for Voiceover Work',
    type: 'website',
    locale: 'en_US',
    siteName: 'VoiceoverStudioFinder',
    url: 'https://voiceoverstudiofinder.com',
    images: [
      {
        url: 'https://voiceoverstudiofinder.com/images/homepage.jpg',
        width: 1200,
        height: 630,
        alt: 'VoiceoverStudioFinder - Find Professional Recording Studios',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceoverStudioFinder',
    description: 'Find Professional Recording Studios for Voiceover Work',
    site: '@VOStudioFinder',
    images: ['https://voiceoverstudiofinder.com/images/homepage.jpg'],
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Fetch featured studios for the homepage (available to all users)
  // Only show studios where user_profiles.is_featured === true, limited to 6
  const featuredStudiosRaw = await db.studios.findMany({
    where: {
      status: 'ACTIVE',
      users: {
        user_profiles: {
          is_featured: true,
        },
      },
    },
    include: {
      users: {
        select: {
          display_name: true,
          username: true,
          avatar_url: true,
          user_profiles: {
            select: {
              short_about: true,
              location: true,
              is_featured: true,
            },
          },
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

  // Get total counts for stats
  const [totalStudios, totalUsers, uniqueCountries] = await Promise.all([
    db.studios.count({ where: { status: 'ACTIVE' } }),
    db.users.count(),
    // Count unique countries from user_profiles.location
    db.user_profiles.findMany({
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

  // Convert Decimal fields to numbers and map short_about to description for client components
  const serializedStudios = featuredStudios.map(studio => ({
    ...studio,
    description: studio.users?.user_profiles?.short_about || '', // Use short_about as description
    latitude: studio.latitude ? Number(studio.latitude) : null,
    longitude: studio.longitude ? Number(studio.longitude) : null,
    owner: studio.users ? { 
      username: studio.users.username,
      display_name: studio.users.display_name,
      avatar_url: studio.users.avatar_url,
    } : undefined, // Map users to owner for component with avatar
    location: studio.users?.user_profiles?.location || '', // Keep location for backward compatibility
    city: studio.city || '', // Add city field for display
    address: studio.address || '', // Ensure address is available
    // Pass studio_images directly with snake_case
    studio_images: studio.studio_images?.map(img => ({
      image_url: img.image_url,
      alt_text: img.alt_text,
    })) || [],
  }));

  return (
    <HomePage
      session={session}
      featuredStudios={serializedStudios}
      stats={{
        totalStudios,
        totalUsers,
        totalCountries: uniqueCountries,
      }}
    />
  );
}

