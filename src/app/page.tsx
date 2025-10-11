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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoiceoverStudioFinder',
    description: 'Find Professional Recording Studios for Voiceover Work',
    site: '@VOStudioFinder',
  },
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Fetch featured studios for the homepage (available to all users)
  const featuredStudios = await db.studios.findMany({
    where: {
      status: 'ACTIVE',
      is_verified: true,
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
    take: 6,
    orderBy: [
      { is_premium: 'desc' },
      { created_at: 'desc' },
    ],
  });

  // Get total counts for stats
  const [totalStudios, totalUsers] = await Promise.all([
    db.studios.count({ where: { status: 'ACTIVE' } }),
    db.users.count(),
  ]);

  // Convert Decimal fields to numbers and map short_about to description for client components
  const serializedStudios = featuredStudios.map(studio => ({
    ...studio,
    description: studio.users?.user_profiles?.short_about || '', // Use short_about as description
    latitude: studio.latitude ? Number(studio.latitude) : null,
    longitude: studio.longitude ? Number(studio.longitude) : null,
  }));

  return (
    <HomePage
      session={session}
      featuredStudios={serializedStudios}
      stats={{
        totalStudios,
        totalUsers,
      }}
    />
  );
}

