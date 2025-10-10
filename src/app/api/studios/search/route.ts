import { NextRequest, NextResponse } from 'next/server';
import { studioSearchSchema } from '@/lib/validations/studio';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { cache } from '@/lib/cache';
import { Prisma, ServiceType } from '@prisma/client';
import { geocodeAddress, calculateDistance } from '@/lib/maps';
import crypto from 'crypto';

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
      studioTypes: searchParams.get('studioTypes')?.split(',') || searchParams.get('studioType')?.split(',') || searchParams.get('type')?.split(',') || undefined, // Support multiple parameters
      services: searchParams.get('services')?.split(',') || undefined,
      equipment: searchParams.get('equipment')?.split(',') || undefined, // New equipment parameter
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') || 'name',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    };

    const validatedParams = studioSearchSchema.parse(params);

    // Generate cache key based on search parameters
    const cacheKey = crypto
      .createHash('md5')
      .update(JSON.stringify(validatedParams))
      .digest('hex');

    // Try to get cached results first
    const cachedResults = await cache.getCachedSearchResults(cacheKey);
    if (cachedResults) {
      return NextResponse.json(cachedResults);
    }

    // Build where clause
    const where: Prisma.StudioWhereInput = {
      status: 'ACTIVE',
      AND: [],
    };

    // Enhanced full-text search in name, description, and services
    if (validatedParams.query) {
      (where.AND as Prisma.StudioWhereInput[]).push({
        OR: [
          // Exact name match (highest priority)
          { name: { equals: validatedParams.query, mode: 'insensitive' } },
          // Name contains all terms
          { name: { contains: validatedParams.query, mode: 'insensitive' } },
          // Description contains all terms
          { description: { contains: validatedParams.query, mode: 'insensitive' } },
          // Any service matches
          {
            services: {
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
              (where.AND as Prisma.StudioWhereInput[]).push({
                address: { contains: validatedParams.location, mode: 'insensitive' },
              });
            }
          } catch (error) {
            console.error('Geocoding error:', error);
            // Fall back to text-based address search
            (where.AND as Prisma.StudioWhereInput[]).push({
              address: { contains: validatedParams.location, mode: 'insensitive' },
            });
          }
        }
        
        // For geographic search, we'll filter studios after fetching them
        // This allows us to calculate precise distances
        // Note: For better performance with large datasets, consider using PostGIS or similar
      } else {
        // Standard address search without radius
        (where.AND as Prisma.StudioWhereInput[]).push({
          address: { contains: validatedParams.location, mode: 'insensitive' },
        });
      }
    }

    // Studio types filter - enhanced to handle multiple types and NLP-detected types
    if (validatedParams.studioTypes && validatedParams.studioTypes.length > 0) {
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

      const mappedTypes = validatedParams.studioTypes
        .map(type => studioTypeMapping[type.toLowerCase()] || type.toUpperCase())
        .filter(type => type); // Remove any undefined values

      if (mappedTypes.length > 0) {
        (where.AND as Prisma.StudioWhereInput[]).push({
          studioTypes: {
            some: {
              studioType: {
                in: mappedTypes as any[],
              },
            },
          },
        });
      }
    }

    // Services filter with string-to-enum mapping
    if (validatedParams.services && validatedParams.services.length > 0) {
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

      const mappedServices = validatedParams.services
        .map(service => serviceMapping[service.toLowerCase()] || service.toUpperCase())
        .filter(service => service); // Remove any undefined values

      if (mappedServices.length > 0) {
        (where.AND as Prisma.StudioWhereInput[]).push({
          services: {
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

      (where.AND as Prisma.StudioWhereInput[]).push({
        OR: equipmentConditions,
      });
    }

    // Build order by clause
    const orderBy: Prisma.StudioOrderByWithRelationInput[] = [];
    
    // Always prioritize premium studios
    orderBy.push({ is_premium: 'desc' });
    
    switch (validatedParams.sortBy) {
      case 'name':
        orderBy.push({ name: validatedParams.sortOrder as 'asc' | 'desc' });
        break;
      case 'created_at':
        orderBy.push({ created_at: validatedParams.sortOrder as 'asc' | 'desc' });
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
          owner: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              profile: {
                select: {
                  shortAbout: true,
                },
              },
            },
          },
          studioTypes: {
            select: {
              studioType: true,
            },
          },
          services: {
            select: {
              service: true,
            },
          },
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: {
              imageUrl: true,
              altText: true,
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
      
      // Apply pagination to filtered results
      const skip = (validatedParams.page - 1) * validatedParams.limit;
      studios = studiosWithDistance.slice(skip, skip + validatedParams.limit);

      console.log(`Found ${totalCount} studios within ${validatedParams.radius} miles of ${validatedParams.location}`);
    } else {
      // Standard non-geographic search
      [studios, totalCount] = await Promise.all([
        db.studios.findMany({
          where,
          orderBy,
          skip,
          take: validatedParams.limit,
          include: {
            owner: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                profile: {
                  select: {
                    shortAbout: true,
                  },
                },
              },
            },
            studioTypes: {
              select: {
                studioType: true,
              },
            },
            services: {
              select: {
                service: true,
              },
            },
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
              select: {
                imageUrl: true,
                altText: true,
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

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    // Serialize Decimal fields and map shortAbout to description for JSON response
    const serializedStudios = studios.map(studio => ({
      ...studio,
      description: studio.owner?.profile?.shortAbout || '', // Use shortAbout as description
      latitude: studio.latitude ? Number(studio.latitude) : null,
      longitude: studio.longitude ? Number(studio.longitude) : null,
    }));

    // Get map markers based on search criteria
    // For location-based searches, only show studios that match the search criteria
    // For general searches, show all active studios
    const hasLocationSearch = validatedParams.location && validatedParams.radius;
    const hasOtherFilters = validatedParams.query || validatedParams.studioTypes?.length || validatedParams.services?.length || validatedParams.equipment?.length;
    
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
            studioTypes: {
              select: {
                studioType: true,
              },
            },
            is_verified: true,
          },
        });
        
        // Filter by distance for location searches
        mapMarkers = mapMarkers.filter(studio => {
          if (!studio.latitude || !studio.longitude) return false;
          const distance = calculateDistance(
            searchCoordinates.lat,
            searchCoordinates.lng,
            Number(studio.latitude),
            Number(studio.longitude)
          );
          return distance <= validatedParams.radius!;
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
            studioTypes: {
              select: {
                studioType: true,
              },
            },
            is_verified: true,
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
          studioTypes: {
            select: {
              studioType: true,
            },
          },
          is_verified: true,
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
          studioTypes: {
            select: {
              studioType: true,
            },
          },
          is_verified: true,
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
        studioTypes: validatedParams.studioTypes,
        services: validatedParams.services,
      },
      searchCoordinates: searchCoordinates,
      searchRadius: validatedParams.radius,
    };

    // Cache the results for 5 minutes
    await cache.cacheSearchResults(cacheKey, response, 300);

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
