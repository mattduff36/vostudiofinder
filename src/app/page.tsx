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
  
  // Fetch some featured studios for the homepage
  const featuredStudios = await db.studio.findMany({
    where: {
      status: 'ACTIVE',
      isVerified: true,
    },
    include: {
      owner: {
        select: {
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
      services: true,
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' },
      },
      _count: {
        select: { reviews: true },
      },
    },
    take: 6,
    orderBy: [
      { isPremium: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  // Get total counts for stats
  const [totalStudios, totalUsers] = await Promise.all([
    db.studio.count({ where: { status: 'ACTIVE' } }),
    db.user.count(),
  ]);

  // Convert Decimal fields to numbers for client components
  const serializedStudios = featuredStudios.map(studio => ({
    ...studio,
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