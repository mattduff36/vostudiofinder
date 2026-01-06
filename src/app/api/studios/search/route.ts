import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { studioSearchSchema } from '@/lib/validations/studio';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { cache } from '@/lib/cache';
import { Prisma, ServiceType } from '@prisma/client';
import { geocodeAddress, calculateDistance } from '@/lib/maps';
import crypto from 'crypto';

// Fisher-Yates shuffle algorithm for randomizing array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

// Prioritize studios: verified+images -> images -> no images, randomized within each tier
// Always pins VoiceoverGuy (site owner) to the top if present
function prioritizeStudios<T extends { 
  is_verified: boolean; 
  studio_images: any[];
  users?: { username?: string | null } | null;
}>(studios: T[], offset: number, limit: number): { studios: T[]; hasMore: boolean } {
  if (studios.length === 0) return { studios: [], hasMore: false };
  
  // Find VoiceoverGuy studio to pin at the top (site owner)
  const voiceoverGuy = studios.find(
    s => s.users?.username === 'VoiceoverGuy'
  );
  const remainingStudios = studios.filter(
    s => s.users?.username !== 'VoiceoverGuy'
  );
  
  // Tier 1: Verified with at least 1 image
  const verifiedWithImages = remainingStudios.filter(
    s => s.is_verified && s.studio_images && s.studio_images.length > 0
  );
  
  // Tier 2: Non-verified with at least 1 image
  const nonVerifiedWithImages = remainingStudios.filter(
    s => !s.is_verified && s.studio_images && s.studio_images.length > 0
  );
  
  // Tier 3: Studios without images
  const withoutImages = remainingStudios.filter(
    s => !s.studio_images || s.studio_images.length === 0
  );
  
  // Shuffle each tier
  const shuffledVerified = shuffleArray(verifiedWithImages);
  const shuffledWithImages = shuffleArray(nonVerifiedWithImages);
  const shuffledWithoutImages = shuffleArray(withoutImages);
  
  // Combine tiers in priority order, with VoiceoverGuy always first if present
  const allPrioritized = [
    ...(voiceoverGuy ? [voiceoverGuy] : []),
    ...shuffledVerified,
    ...shuffledWithImages,
    ...shuffledWithoutImages
  ];
  
  // Apply offset and limit
  const paginatedStudios = allPrioritized.slice(offset, offset + limit);
  const hasMore = allPrioritized.length > offset + limit;
  
  return { studios: paginatedStudios, hasMore };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search parameters
    const params = {
      query: searchParams.get('q') || undefined,
      location: searchParams.get('location') || undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      studio_studio_types: searchParams.get('studioTypes')?.split(',') || searchParams.get('studio_type')?.split(',') || searchParams.get('type')?.split(',') || undefined, // Support multiple parameters
      studio_services: searchParams.get('services')?.split(',') || undefined,
      equipment: searchParams.get('equipment')?.split(',') || undefined, // New equipment parameter
      studioId: searchParams.get('studioId') || undefined, // Specific studio ID for fetching single studio
      ids: searchParams.get('ids')?.split(',') || undefined, // Multiple studio IDs for map area filtering
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '30'),
      offset: parseInt(searchParams.get('offset') || '0'), // New offset parameter for load-more pattern
      sortBy: searchParams.get('sortBy') || 'name',
      sort_order: searchParams.get('sort_order') || 'asc',
    };

    const validatedParams = studioSearchSchema.parse(params);

    // Generate cache key based on search parameters
    const cacheKey = crypto
      .createHash('md5')
      .update(JSON.stringify(validatedParams))
      .digest('hex');

    // Skip caching for page 1 to ensure random results on each load
    const shouldUseCache = validatedParams.page !== 1;
    
    // Try to get cached results first (only for pages 2+)
    if (shouldUseCache) {
      const cachedResults = await cache.getCachedSearchResults(cacheKey);
      if (cachedResults) {
        return NextResponse.json(cachedResults);
      }
    }

    // Lazy enforcement: update expired memberships to INACTIVE status (skip admin accounts)
    // This ensures search results are accurate even if no one has logged in recently
    try {
      const now = new Date();
      
      // Find studios with expired memberships that are still ACTIVE (exclude admin emails)
      const expiredStudios = await db.studio_profiles.findMany({
        where: {
          status: 'ACTIVE',
          users: {
            email: {
              notIn: ['admin@mpdee.co.uk', 'guy@voiceoverguy.co.uk']
            },
            subscriptions: {
              some: {
                current_period_end: {
                  lt: now
                }
              }
            }
          }
        },
        select: {
          id: true,
          users: {
            select: {
              subscriptions: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                  current_period_end: true
                }
              }
            }
          }
        }
      });

      // Filter to only include studios whose latest subscription is expired
      const studiesToDeactivate = expiredStudios.filter(studio => {
        const latestSub = studio.users?.subscriptions[0];
        return latestSub && latestSub.current_period_end && latestSub.current_period_end < now;
      });

      // Batch update expired studios to INACTIVE
      if (studiesToDeactivate.length > 0) {
        await db.studio_profiles.updateMany({
          where: {
            id: {
              in: studiesToDeactivate.map(s => s.id)
            }
          },
          data: {
            status: 'INACTIVE',
            updated_at: now
          }
        });
        logger.log(`🔄 Search: Updated ${studiesToDeactivate.length} expired studios to INACTIVE`);
      }
      
      // Lazy enforcement: unfeature expired featured studios
      const expiredFeaturedStudios = await db.studio_profiles.findMany({
        where: {
          is_featured: true,
          featured_until: {
            lt: now
          }
        },
        select: {
          id: true
        }
      });

      if (expiredFeaturedStudios.length > 0) {
        await db.studio_profiles.updateMany({
          where: {
            id: {
              in: expiredFeaturedStudios.map(s => s.id)
            }
          },
          data: {
            is_featured: false,
            updated_at: now
          }
        });
        logger.log(`🔄 Search: Unfeatured ${expiredFeaturedStudios.length} expired featured studios`);
      }
    } catch (enforcementError) {
      // Log but don't fail the search if enforcement fails
      logger.error('Search lazy enforcement error:', enforcementError);
    }

    // Build where clause
    const where: Prisma.studio_profilesWhereInput = {
      status: 'ACTIVE',
      is_profile_visible: true, // Only show visible profiles
      AND: [],
    };

    // If searching for a specific studio ID, add it to the where clause
    if (validatedParams.studioId) {
      (where.AND as Prisma.studio_profilesWhereInput[]).push({
        id: validatedParams.studioId,
      });
    }

    // If searching for multiple studio IDs (for map area filtering), add them to the where clause
    if (validatedParams.ids && validatedParams.ids.length > 0) {
      (where.AND as Prisma.studio_profilesWhereInput[]).push({
        id: { in: validatedParams.ids },
      });
    }

    // Enhanced full-text search in name, description, and services
    if (validatedParams.query) {
      (where.AND as Prisma.studio_profilesWhereInput[]).push({
        OR: [
          // Exact name match (highest priority)
          { name: { equals: validatedParams.query, mode: 'insensitive' } },
          // Name contains all terms
          { name: { contains: validatedParams.query, mode: 'insensitive' } },
          // Description contains all terms
          { description: { contains: validatedParams.query, mode: 'insensitive' } },
          // Any service matches
          {
            studio_services: {
              some: {
                service: { 
                  in: Object.values(ServiceType).filter(service => 
                    service.toLowerCase().includes(validatedParams.query!.toLowerCase())
                  ) as ServiceType[]
                },
              },
            },
          },
          // Address contains search terms
          { full_address: { contains: validatedParams.query, mode: 'insensitive' } },
        ],
      });
    }

    // Enhanced location search with radius support using Google Maps API
    let searchCoordinates: { lat: number; lng: number } | null = null;
    if (validatedParams.location) {
      if (validatedParams.radius && validatedParams.radius > 0) {
        // First check if we already have coordinates from URL parameters
        if (validatedParams.lat && validatedParams.lng) {
          searchCoordinates = { lat: validatedParams.lat, lng: validatedParams.lng };
          logger.log(`Using existing coordinates for "${validatedParams.location}":`, searchCoordinates);
        } else {
          // Use Google Maps API to geocode the search location
          try {
            const geocodeResult = await geocodeAddress(validatedParams.location);
            if (geocodeResult) {
              searchCoordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
              logger.log(`Geocoded "${validatedParams.location}" to:`, searchCoordinates);
            } else {
              logger.warn(`Failed to geocode location: ${validatedParams.location}`);
              // Fall back to text-based address search
              (where.AND as Prisma.studio_profilesWhereInput[]).push({
                full_address: { contains: validatedParams.location, mode: 'insensitive' },
              });
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            // Fall back to text-based address search
            (where.AND as Prisma.studio_profilesWhereInput[]).push({
              full_address: { contains: validatedParams.location, mode: 'insensitive' },
            });
          }
        }
        
        // For geographic search, we'll filter studios after fetching them
        // This allows us to calculate precise distances
        // Note: For better performance with large datasets, consider using PostGIS or similar
      } else {
        // Standard address search without radius
        (where.AND as Prisma.studio_profilesWhereInput[]).push({
          full_address: { contains: validatedParams.location, mode: 'insensitive' },
        });
      }
    }

    // Studio types filter - enhanced to handle multiple types and NLP-detected types
    if (validatedParams.studio_studio_types && validatedParams.studio_studio_types.length > 0) {
      // Map common NLP terms to database enum values
      const studioTypeMapping: { [key: string]: string } = {
        'podcast': 'PODCAST',
        'podcasting': 'PODCAST', 
        'recording': 'RECORDING',
        'voice over': 'VOICEOVER',
        'voiceover': 'VOICEOVER',
        'voice over studio': 'VOICEOVER',
        'voiceover studio': 'VOICEOVER',
        'broadcast': 'VOICEOVER',
        'radio': 'VOICEOVER',
        'tv': 'VOICEOVER',
        'television': 'VOICEOVER',
        'music': 'RECORDING',
        'audio': 'RECORDING',
        'sound': 'RECORDING'
      };

      const mappedTypes = validatedParams.studio_studio_types
        .map(type => studioTypeMapping[type.toLowerCase()] || type.toUpperCase())
        .filter(type => type); // Remove any undefined values

      if (mappedTypes.length > 0) {
        (where.AND as Prisma.studio_profilesWhereInput[]).push({
          studio_studio_types: {
            some: {
              studio_type: {
                in: mappedTypes as any[],
              },
            },
          },
        });
      }
    }

    // Services filter with string-to-enum mapping
    if (validatedParams.studio_services && validatedParams.studio_services.length > 0) {
      // Map common service terms to database enum values
      const serviceMapping: { [key: string]: string } = {
        'isdn': 'ISDN',
        'source connect': 'SOURCE_CONNECT',
        'source connect now': 'SOURCE_CONNECT_NOW',
        'cleanfeed': 'CLEANFEED',
        'sessionlinkpro': 'SESSION_LINK_PRO',
        'session link pro': 'SESSION_LINK_PRO',
        'skype': 'SKYPE',
        'zoom': 'ZOOM',
        'teams': 'TEAMS',
        'google meet': 'GOOGLE_MEET',
        'phone patch': 'PHONE_PATCH',
        'remote recording': 'REMOTE_RECORDING',
        'live streaming': 'LIVE_STREAMING'
      };

      const mappedServices = validatedParams.studio_services
        .map(service => serviceMapping[service.toLowerCase()] || service.toUpperCase())
        .filter(service => service); // Remove any undefined values

      if (mappedServices.length > 0) {
        (where.AND as Prisma.studio_profilesWhereInput[]).push({
          studio_services: {
            some: {
              service: {
                in: mappedServices as any[],
              },
            },
          },
        });
      }
    }

    // Equipment filter - search in description and name for equipment keywords
    if (validatedParams.equipment && validatedParams.equipment.length > 0) {
      const equipmentConditions = validatedParams.equipment.map(equipment => ({
        OR: [
          { name: { contains: equipment, mode: 'insensitive' as const } },
          { description: { contains: equipment, mode: 'insensitive' as const } },
        ],
      }));

      (where.AND as Prisma.studio_profilesWhereInput[]).push({
        OR: equipmentConditions,
      });
    }

    // Build order by clause
    const orderBy: Prisma.studio_profilesOrderByWithRelationInput[] = [];
    
    // Always prioritize premium studios
    orderBy.push({ is_premium: 'desc' });
    
    switch (validatedParams.sortBy) {
      case 'name':
        orderBy.push({ name: validatedParams.sort_order as 'asc' | 'desc' });
        break;
      case 'created_at':
        orderBy.push({ created_at: validatedParams.sort_order as 'asc' | 'desc' });
        break;
      case 'rating':
        // This would require a more complex query with review aggregation
        // For now, fall back to creation date
        orderBy.push({ created_at: 'desc' });
        break;
      default:
        orderBy.push({ name: 'asc' });
    }

    // Use offset for load-more pattern instead of page-based pagination
    const offset = validatedParams.offset || 0;

    // Execute search query - fetch all matching studios for prioritization
    let allStudios: any[];
    let totalCount: number;
    let hasMore: boolean;

    // Fetch all matching studios (we'll apply prioritization and pagination in memory)
    const fetchedStudios = await db.studio_profiles.findMany({
      where,
      select: {
        id: true,
        name: true,
        short_about: true,
        description: true,
        abbreviated_address: true,  // PRIVACY: Use abbreviated_address instead of full_address
        city: true,
        location: true,
        latitude: true,
        longitude: true,
        phone: true,
        website_url: true,
        is_premium: true,
        is_verified: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        users: {
          select: {
            id: true,
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
        studio_studio_types: {
          select: {
            studio_type: true,
          },
        },
        studio_services: {
          select: {
            service: true,
          },
        },
        studio_images: {
          orderBy: { sort_order: 'asc' },
          select: {
            image_url: true,
            alt_text: true,
          },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    // Filter by geographic distance if applicable
    if (searchCoordinates && validatedParams.radius) {
      allStudios = fetchedStudios
        .map(studio => {
          if (studio.latitude && studio.longitude) {
            const distance = calculateDistance(
              searchCoordinates.lat,
              searchCoordinates.lng,
              Number(studio.latitude),
              Number(studio.longitude)
            );
            const distanceInMiles = distance * 0.621371;
            
            if (distanceInMiles <= validatedParams.radius!) {
              return {
                ...studio,
                distance: distanceInMiles,
              };
            }
          }
          return null;
        })
        .filter((studio): studio is NonNullable<typeof studio> => studio !== null);

      logger.log(`Found ${allStudios.length} studios within ${validatedParams.radius} miles of ${validatedParams.location}`);
    } else {
      allStudios = fetchedStudios;
    }

    // Apply prioritization logic (verified+images -> images -> no images)
    totalCount = allStudios.length;
    const prioritized = prioritizeStudios(allStudios, offset, validatedParams.limit);
    const studios = prioritized.studios;
    hasMore = prioritized.hasMore;

    // Calculate pagination info for load-more pattern
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = hasMore;
    const hasPrevPage = offset > 0;

    // Serialize Decimal fields and map short_about to description for JSON response
    const serializedStudios = studios.map(studio => ({
      ...studio,
      description: studio.short_about || '', // short_about is now directly on studio_profiles
      address: studio.abbreviated_address || '', // PRIVACY: Use abbreviated_address for public display
      latitude: studio.latitude ? Number(studio.latitude) : null,
      longitude: studio.longitude ? Number(studio.longitude) : null,
      owner: studio.users, // Map users to owner for backward compatibility with studio cards
      studio_images: studio.studio_images || [],
    }));

    // Get map markers based on search criteria
    // For location-based searches, only show studios that match the search criteria
    // For general searches, show all active studios
    const hasLocationSearch = validatedParams.location && validatedParams.radius;
    const hasOtherFilters = validatedParams.query || validatedParams.studio_studio_types?.length || validatedParams.studio_services?.length || validatedParams.equipment?.length;
    
    let mapMarkers;
    if (hasLocationSearch) {
      // For location searches, only show studios within the search radius
      // Use the same filtering logic as the main query
      if (searchCoordinates && validatedParams.radius) {
        // Get all studios that match the search criteria (not just paginated results)
        mapMarkers = await db.studio_profiles.findMany({
          where,
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            studio_studio_types: {
              select: {
                studio_type: true,
              },
            },
            is_verified: true,
            users: {
              select: {
                username: true,
                avatar_url: true,
              },
            },
            studio_images: {
              select: {
                image_url: true,
                alt_text: true,
              },
              orderBy: {
                sort_order: 'asc',
              },
              take: 1, // Only get the first image
            },
          },
        });
        
        // Filter by distance for location searches
        mapMarkers = mapMarkers.filter(studio => {
          if (!studio.latitude || !studio.longitude) return false;
          const distanceKm = calculateDistance(
            searchCoordinates.lat,
            searchCoordinates.lng,
            Number(studio.latitude),
            Number(studio.longitude)
          );
          const distanceMiles = distanceKm * 0.621371; // Convert km to miles
          return distanceMiles <= validatedParams.radius!;
        });
      } else {
        // Fallback to filtered results
        mapMarkers = await db.studio_profiles.findMany({
          where,
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            studio_studio_types: {
              select: {
                studio_type: true,
              },
            },
            is_verified: true,
            users: {
              select: {
                username: true,
                avatar_url: true,
              },
            },
            studio_images: {
              select: {
                image_url: true,
                alt_text: true,
              },
              orderBy: {
                sort_order: 'asc',
              },
              take: 1, // Only get the first image
            },
          },
        });
      }
    } else if (hasOtherFilters) {
      // For other filters, show all matching studios
      mapMarkers = await db.studio_profiles.findMany({
        where,
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          studio_studio_types: {
            select: {
              studio_type: true,
            },
          },
          is_verified: true,
          users: {
            select: {
              username: true,
              avatar_url: true,
            },
          },
          studio_images: {
            select: {
              image_url: true,
              alt_text: true,
            },
            orderBy: {
              sort_order: 'asc',
            },
            take: 1, // Only get the first image
          },
        },
      });
    } else {
      // No filters - show ALL active and visible studios on map
      mapMarkers = await db.studio_profiles.findMany({
        where: { status: 'ACTIVE', is_profile_visible: true },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          studio_studio_types: {
            select: {
              studio_type: true,
            },
          },
          is_verified: true,
          users: {
            select: {
              username: true,
              avatar_url: true,
            },
          },
          studio_images: {
            select: {
              image_url: true,
              alt_text: true,
            },
            orderBy: {
              sort_order: 'asc',
            },
            take: 1, // Only get the first image
          },
        },
      });
    }

    // Serialize map markers - filter out studios without coordinates
    const serializedMapMarkers = mapMarkers
      .filter(studio => studio.latitude !== null && studio.longitude !== null)
      .map(studio => ({
        ...studio,
        latitude: Number(studio.latitude),
        longitude: Number(studio.longitude),
      }));

    const response = {
      studios: serializedStudios,
      mapMarkers: serializedMapMarkers, // Separate data for map pins
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        offset: offset,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
        hasMore, // New flag for load-more pattern
      },
      filters: {
        query: validatedParams.query,
        location: validatedParams.location,
        studio_studio_types: validatedParams.studio_studio_types,
        studio_services: validatedParams.studio_services,
      },
      searchCoordinates: searchCoordinates,
      searchRadius: validatedParams.radius,
    };

    // Cache the results for 5 minutes (only for pages 2+)
    if (shouldUseCache) {
      await cache.cacheSearchResults(cacheKey, response, 300);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Studio search error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: 'Invalid search parameters' },
        { status: 400 }
      );
    }
    
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
