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
  const featuredUsers = await prisma.user.findMany({
    where: {
      profile: {
        isFeatured: true
      }
    },
    include: {
      profile: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true, 
          name: true,
          studioTypes: {
            select: {
              studioType: true
            }
          }
        }
      }
    },
    orderBy: [
      { profile: { isSpotlight: 'desc' } },
      { createdAt: 'desc' }
    ],
    take: 12
  });

  // Get spotlight users
  const spotlightUsers = await prisma.user.findMany({
    where: {
      profile: {
        isSpotlight: true
      }
    },
    include: {
      profile: true,
      studios: {
        where: { status: 'ACTIVE' },
        select: { 
          id: true, 
          name: true,
          studioTypes: {
            select: {
              studioType: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 12
  });

  // Get premium studios
  const premiumStudios = await prisma.studio.findMany({
    where: {
      OR: [
        { isPremium: true },
        { isVerified: true },
        {
          owner: {
            profile: {
              OR: [
                { isFeatured: true },
                { isSpotlight: true }
              ]
            }
          }
        }
      ],
      status: 'ACTIVE'
    },
    include: {
      owner: {
        include: {
          profile: true
        }
      },
      studioTypes: {
        select: {
          studioType: true
        }
      }
    },
    orderBy: [
      { isPremium: 'desc' },
      { isVerified: 'desc' },
      { owner: { profile: { isSpotlight: 'desc' } } },
      { owner: { profile: { isFeatured: 'desc' } } },
      { createdAt: 'desc' }
    ],
    take: 12
  });

  // Get premium stats
  const [
    totalFeatured,
    totalSpotlight,
    totalPremiumStudios
  ] = await Promise.all([
    prisma.user.count({
      where: {
        profile: { isFeatured: true }
      }
    }),
    prisma.user.count({
      where: {
        profile: { isSpotlight: true }
      }
    }),
    prisma.studio.count({
      where: {
        OR: [
          { isPremium: true },
          { isVerified: true }
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
