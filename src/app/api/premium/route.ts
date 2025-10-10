import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    switch (type) {
      case 'featured':
        return getFeaturedUsers();
      case 'spotlight':
        return getSpotlightUsers();
      case 'studios':
        return getPremiumStudios();
      case 'stats':
        return getPremiumStats();
      case 'all':
        return getAllPremiumData();
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Premium API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getFeaturedUsers() {
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
      { profile: { isSpotlight: 'desc' } }, // Spotlight users first
      { created_at: 'desc' }
    ],
    take: 20
  });

  return NextResponse.json({ featuredUsers });
}

async function getSpotlightUsers() {
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
      created_at: 'desc'
    },
    take: 20
  });

  return NextResponse.json({ spotlightUsers });
}

async function getPremiumStudios() {
  const premiumStudios = await prisma.studio.findMany({
    where: {
      OR: [
        { is_premium: true },
        { is_verified: true },
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
      images: {
        take: 1,
        orderBy: { sortOrder: 'asc' }
      },
      services: true,
      _count: {
        select: {
          reviews: {
            where: { status: 'APPROVED' }
          }
        }
      }
    },
    orderBy: [
      { is_premium: 'desc' },
      { is_verified: 'desc' },
      { owner: { profile: { isSpotlight: 'desc' } } },
      { owner: { profile: { isFeatured: 'desc' } } },
      { created_at: 'desc' }
    ],
    take: 20
  });

  return NextResponse.json({ premiumStudios });
}

async function getPremiumStats() {
  // Get counts for different premium tiers
  const [
    totalFeatured,
    totalSpotlight,
    totalPremiumStudios,
    totalVerifiedStudios
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
        is_premium: true,
        status: 'ACTIVE'
      }
    }),
    prisma.studio.count({
      where: {
        is_verified: true,
        status: 'ACTIVE'
      }
    })
  ]);

  // Calculate average visibility boost (mock data for now)
  const averageViews = 250; // 250% more visibility for premium users

  const stats = {
    totalFeatured,
    totalSpotlight,
    totalPremiumStudios: totalPremiumStudios + totalVerifiedStudios,
    averageViews
  };

  return NextResponse.json({ stats });
}

async function getAllPremiumData() {
  const [
    featuredUsersResponse,
    spotlightUsersResponse,
    premiumStudiosResponse,
    statsResponse
  ] = await Promise.all([
    getFeaturedUsers(),
    getSpotlightUsers(),
    getPremiumStudios(),
    getPremiumStats()
  ]);

  const [
    featuredUsersData,
    spotlightUsersData,
    premiumStudiosData,
    statsData
  ] = await Promise.all([
    featuredUsersResponse.json(),
    spotlightUsersResponse.json(),
    premiumStudiosResponse.json(),
    statsResponse.json()
  ]);

  return NextResponse.json({
    featuredUsers: featuredUsersData.featuredUsers,
    spotlightUsers: spotlightUsersData.spotlightUsers,
    premiumStudios: premiumStudiosData.premiumStudios,
    premiumStats: statsData.stats
  });
}

// Enhanced search that prioritizes premium users
export async function POST(request: NextRequest) {
  try {
    const { query, filters } = await request.json();

    const searchResults = await prisma.user.findMany({
      where: {
        AND: [
          // Text search
          query ? {
            OR: [
              { displayName: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
              { profile: { location: { contains: query, mode: 'insensitive' } } },
              { profile: { about: { contains: query, mode: 'insensitive' } } }
            ]
          } : {},
          // Filters
          filters?.location ? {
            profile: { location: { contains: filters.location, mode: 'insensitive' } }
          } : {},
          filters?.hasStudio ? {
            studios: { some: { status: 'ACTIVE' } }
          } : {},
          filters?.premiumOnly ? {
            profile: {
              OR: [
                { isFeatured: true },
                { isSpotlight: true }
              ]
            }
          } : {}
        ]
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
          },
          is_premium: true, 
          is_verified: true 
        }
        }
      },
      orderBy: [
        // Premium users first
        { profile: { isSpotlight: 'desc' } },
        { profile: { isFeatured: 'desc' } },
        { studios: { _count: 'desc' } },
        { created_at: 'desc' }
      ],
      take: 50
    });

    return NextResponse.json({ results: searchResults });
  } catch (error) {
    console.error('Premium search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
