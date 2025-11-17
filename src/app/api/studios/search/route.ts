import { NextRequest, NextResponse } from 'next/server';
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

// Pin a specific studio to the top 6 positions
function pinStudioToTop6<T extends { name: string }>(studios: T[]): T[] {
  if (studios.length === 0) return studios;
  
  // Find the target studio (VoiceoverGuy - Yorkshire Recording Studio)
  const targetIndex = studios.findIndex(studio => 
    studio.name.toLowerCase().includes('voiceoverguy') && 
    studio.name.toLowerCase().includes('yorkshire')
  );
  
  // If studio not found or already in top 6, return as is
  if (targetIndex === -1 || targetIndex < 6) {
    return studios;
  }
  
  // Remove the studio from its current position and insert at random position in top 6
  const insertPosition = Math.floor(Math.random() * 6);
  const [targetStudio] = studios.splice(targetIndex, 1);
  
  // Safety check - this should never happen but TypeScript needs it
  if (targetStudio) {
    studios.splice(insertPosition, 0, targetStudio);
  }
  
  return studios;
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
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
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

    // Build where clause
    const where: Prisma.studiosWhereInput = {
      status: 'ACTIVE',
      AND: [],
    };

    // Enhanced full-text search in name, description, and services
    if (validatedParams.query) {
      (where.AND as Prisma.studiosWhereInput[]).push({
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
          { address: { contains: validatedParams.query, mode: 'insensitive' } },
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
          console.log(`Using existing coordinates for "${validatedParams.location}":`, searchCoordinates);
        } else {
          // Use Google Maps API to geocode the search location
          try {
            const geocodeResult = await geocodeAddress(validatedParams.location);
            if (geocodeResult) {
              searchCoordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
              console.log(`Geocoded "${validatedParams.location}" to:`, searchCoordinates);
            } else {
              console.warn(`Failed to geocode location: ${validatedParams.location}`);
              // Fall back to text-based address search
              (where.AND as Prisma.studiosWhereInput[]).push({
                address: { contains: validatedParams.location, mode: 'insensitive' },
              });
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            // Fall back to text-based address search
            (where.AND as Prisma.studiosWhereInput[]).push({
              address: { contains: validatedParams.location, mode: 'insensitive' },
            });
          }
        }
        
        // For geographic search, we'll filter studios after fetching them
        // This allows us to calculate precise distances
        // Note: For better performance with large datasets, consider using PostGIS or similar
      } else {
        // Standard address search without radius
        (where.AND as Prisma.studiosWhereInput[]).push({
          address: { contains: validatedParams.location, mode: 'insensitive' },
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
        (where.AND as Prisma.studiosWhereInput[]).push({
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
        (where.AND as Prisma.studiosWhereInput[]).push({
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

      (where.AND as Prisma.studiosWhereInput[]).push({
        OR: equipmentConditions,
      });
    }

    // Build order by clause
    const orderBy: Prisma.studiosOrderByWithRelationInput[] = [];
    
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

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Execute search query
    let studios: any[];
    let totalCount: number;

    if (searchCoordinates && validatedParams.radius) {
      // For geographic search, fetch all matching studios first, then filter by distance
      const allStudios = await db.studios.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
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
            take: 1,
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

      // Filter studios by distance and add distance property
      const studiosWithDistance = allStudios
        .map(studio => {
          if (studio.latitude && studio.longitude) {
            const distance = calculateDistance(
              searchCoordinates.lat,
              searchCoordinates.lng,
              Number(studio.latitude),
              Number(studio.longitude)
            );
            const distanceInMiles = distance * 0.621371; // Convert km to miles
            
            return {
              ...studio,
              distance: distanceInMiles,
            };
          }
          return null;
        })
        .filter((studio): studio is NonNullable<typeof studio> => 
          studio !== null && studio.distance <= validatedParams.radius!
        )
        .sort((a, b) => {
          // Sort by premium status first, then by distance
          if (a.is_premium !== b.is_premium) {
            return b.is_premium ? 1 : -1;
          }
          return a.distance - b.distance;
        });

      totalCount = studiosWithDistance.length;
      
      // Apply randomization and pinning for page 1 only
      let finalStudiosWithDistance = studiosWithDistance;
      if (validatedParams.page === 1) {
        // Separate premium and non-premium studios to preserve premium priority
        const premiumStudios = finalStudiosWithDistance.filter(s => s.is_premium);
        const nonPremiumStudios = finalStudiosWithDistance.filter(s => !s.is_premium);
        
        // Shuffle non-premium studios
        const shuffledNonPremium = shuffleArray(nonPremiumStudios);
        
        // Combine: premium first, then shuffled non-premium
        finalStudiosWithDistance = [...premiumStudios, ...shuffledNonPremium];
        
        // Pin the target studio to top 6
        finalStudiosWithDistance = pinStudioToTop6(finalStudiosWithDistance);
      }
      
      // Apply pagination to filtered results
      const skip = (validatedParams.page - 1) * validatedParams.limit;
      studios = finalStudiosWithDistance.slice(skip, skip + validatedParams.limit);

      console.log(`Found ${totalCount} studios within ${validatedParams.radius} miles of ${validatedParams.location}`);
    } else {
      // Standard non-geographic search
      // For page 1, fetch all results to randomize; for other pages, use standard pagination
      const shouldRandomize = validatedParams.page === 1;
      
      if (shouldRandomize) {
        // Fetch all results for randomization
        const [allStudios, count] = await Promise.all([
          db.studios.findMany({
            where,
            orderBy,
            include: {
              users: {
                select: {
                  id: true,
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
                take: 1,
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
          }),
          db.studios.count({ where }),
        ]);
        
        totalCount = count;
        
        // Separate premium and non-premium studios
        const premiumStudios = allStudios.filter(s => s.is_premium);
        const nonPremiumStudios = allStudios.filter(s => !s.is_premium);
        
        // Shuffle non-premium studios
        const shuffledNonPremium = shuffleArray(nonPremiumStudios);
        
        // Combine: premium first, then shuffled non-premium
        let finalStudios = [...premiumStudios, ...shuffledNonPremium];
        
        // Pin the target studio to top 6
        finalStudios = pinStudioToTop6(finalStudios);
        
        // Apply pagination manually
        studios = finalStudios.slice(0, validatedParams.limit);
      } else {
        // Standard pagination for pages 2+
        [studios, totalCount] = await Promise.all([
          db.studios.findMany({
            where,
            orderBy,
            skip,
            take: validatedParams.limit,
            include: {
              users: {
                select: {
                  id: true,
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
                take: 1,
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
          }),
          db.studios.count({ where }),
        ]);
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    // Serialize Decimal fields and map short_about to description for JSON response
    const serializedStudios = studios.map(studio => ({
      ...studio,
      description: studio.users?.user_profiles?.short_about || '', // Use short_about as description
      latitude: studio.latitude ? Number(studio.latitude) : null,
      longitude: studio.longitude ? Number(studio.longitude) : null,
      owner: studio.users, // Map users to owner for backward compatibility with studio cards
      studio_images: studio.studio_images?.map((img: any) => ({
        ...img,
        imageUrl: img.image_url, // Add camelCase for backward compatibility
      })) || [],
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
        mapMarkers = await db.studios.findMany({
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
        mapMarkers = await db.studios.findMany({
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
      mapMarkers = await db.studios.findMany({
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
      // No filters - show ALL active studios on map
      mapMarkers = await db.studios.findMany({
        where: { status: 'ACTIVE' },
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
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
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
