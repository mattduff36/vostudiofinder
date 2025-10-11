import { Metadata } from 'next';
import { PremiumFeatures } from '@/components/premium/PremiumFeatures';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Premium Community - VoiceoverStudioFinder',
  description: 'Discover our featured professionals, spotlight members, and premium studios in the voiceover industry.',
  keywords: 'premium voiceover, featured professionals, spotlight members, premium studios, voiceover community'
};

async function getPremiumData() {
  // Get featured users
  const featuredUsers = await prisma.users.findMany({
    where: {
      user_profiles: {
        is_featured: true
      }
    },
    include: {
      user_profiles: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true, 
          name: true,
          studio_studio_types: {
            select: {
              studio_type: true
            }
          }
        }
      }
    },
    orderBy: [
      { user_profiles: { is_spotlight: 'desc' } },
      { created_at: 'desc' }
    ],
    take: 12
  });

  // Get spotlight users
  const spotlightUsers = await prisma.users.findMany({
    where: {
      user_profiles: {
        is_spotlight: true
      }
    },
    include: {
      user_profiles: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true, 
          name: true,
          studio_studio_types: {
            select: {
              studio_type: true
            }
          }
        }
      }
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 12
  });

  // Get premium studios
  const premiumStudios = await prisma.studios.findMany({
    where: {
      OR: [
        { is_premium: true },
        { is_verified: true },
        {
          users: {
            user_profiles: {
              OR: [
                { is_featured: true },
                { is_spotlight: true }
              ]
            }
          }
        }
      ],
      status: 'ACTIVE'
    },
    include: {
      users: {
        include: {
          user_profiles: true
        }
      },
      studio_studio_types: {
        select: {
          studio_type: true
        }
      }
    },
    orderBy: [
      { is_premium: 'desc' },
      { is_verified: 'desc' },
      { users: { user_profiles: { is_spotlight: 'desc' } } },
      { users: { user_profiles: { is_featured: 'desc' } } },
      { created_at: 'desc' }
    ],
    take: 12
  });

  // Get premium stats
  const [
    totalFeatured,
    totalSpotlight,
    totalPremiumStudios
  ] = await Promise.all([
    prisma.users.count({
      where: {
        user_profiles: { is_featured: true }
      }
    }),
    prisma.users.count({
      where: {
        user_profiles: { is_spotlight: true }
      }
    }),
    prisma.studios.count({
      where: {
        OR: [
          { is_premium: true },
          { is_verified: true }
        ],
        status: 'ACTIVE'
      }
    })
  ]);

  const premiumStats = {
    totalFeatured,
    totalSpotlight,
    totalPremiumStudios,
    averageViews: 250 // 250% more visibility
  };

  return {
    featuredUsers,
    spotlightUsers,
    premiumStudios,
    premiumStats
  };
}

export default async function PremiumPage() {
  const { featuredUsers, spotlightUsers, premiumStudios, premiumStats } = await getPremiumData();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PremiumFeatures
          featuredUsers={featuredUsers}
          spotlightUsers={spotlightUsers}
          premiumStudios={premiumStudios}
          premiumStats={premiumStats}
        />
      </div>
    </div>
  );
}

