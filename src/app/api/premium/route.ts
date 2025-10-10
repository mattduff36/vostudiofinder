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
      user_profiles: {
        isFeatured: true
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
      { user_profiles: { isSpotlight: 'desc' } }, // Spotlight users first
      { created_at: 'desc' }
    ],
    take: 20
  });

  return NextResponse.json({ featuredUsers });
}

async function getSpotlightUsers() {
  const spotlightUsers = await prisma.user.findMany({
    where: {
      user_profiles: {
        isSpotlight: true
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
            user_profiles: {
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
      users: {
        include: {
          user_profiles: true
        }
      },
      studio_images: {
        take: 1,
        orderBy: { sort_order: 'asc' }
      },
      studio_services: true,
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
      { owner: { user_profiles: { isSpotlight: 'desc' } } },
      { owner: { user_profiles: { isFeatured: 'desc' } } },
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
        user_profiles: { isFeatured: true }
      }
    }),
    prisma.user.count({
      where: {
        user_profiles: { isSpotlight: true }
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
              { display_name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
              { user_profiles: { location: { contains: query, mode: 'insensitive' } } },
              { user_profiles: { about: { contains: query, mode: 'insensitive' } } }
            ]
          } : {},
          // Filters
          filters?.location ? {
            user_profiles: { location: { contains: filters.location, mode: 'insensitive' } }
          } : {},
          filters?.hasStudio ? {
            studios: { some: { status: 'ACTIVE' } }
          } : {},
          filters?.premiumOnly ? {
            user_profiles: {
              OR: [
                { isFeatured: true },
                { isSpotlight: true }
              ]
            }
          } : {}
        ]
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
          },
          is_premium: true, 
          is_verified: true 
        }
        }
      },
      orderBy: [
        // Premium users first
        { user_profiles: { isSpotlight: 'desc' } },
        { user_profiles: { isFeatured: 'desc' } },
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
