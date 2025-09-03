import { NextRequest, NextResponse } from 'next/server';
import { studioSearchSchema } from '@/lib/validations/studio';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/sentry';
import { cache } from '@/lib/cache';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate search parameters
    const params = {
      query: searchParams.get('q') || undefined,
      location: searchParams.get('location') || undefined,
      radius: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      studioType: searchParams.get('studioType') || undefined,
      services: searchParams.get('services')?.split(',') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
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
      
      where.AND!.push({
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
                service: { contains: validatedParams.query, mode: 'insensitive' },
              },
            },
          },
          // Address contains search terms
          { address: { contains: validatedParams.query, mode: 'insensitive' } },
        ],
      });
    }

    // Location search (basic string matching for now)
    if (validatedParams.location) {
      where.AND!.push({
        address: { contains: validatedParams.location, mode: 'insensitive' },
      });
    }

    // Studio type filter
    if (validatedParams.studioType) {
      where.AND!.push({
        studioType: validatedParams.studioType as any,
      });
    }

    // Services filter
    if (validatedParams.services && validatedParams.services.length > 0) {
      where.AND!.push({
        services: {
          some: {
            service: {
              in: validatedParams.services as any[],
            },
          },
        },
      });
    }

    // Build order by clause
    const orderBy: Prisma.StudioOrderByWithRelationInput[] = [];
    
    // Always prioritize premium studios
    orderBy.push({ isPremium: 'desc' });
    
    switch (validatedParams.sortBy) {
      case 'name':
        orderBy.push({ name: validatedParams.sortOrder as 'asc' | 'desc' });
        break;
      case 'createdAt':
        orderBy.push({ createdAt: validatedParams.sortOrder as 'asc' | 'desc' });
        break;
      case 'rating':
        // This would require a more complex query with review aggregation
        // For now, fall back to creation date
        orderBy.push({ createdAt: 'desc' });
        break;
      default:
        orderBy.push({ name: 'asc' });
    }

    // Calculate pagination
    const skip = (validatedParams.page - 1) * validatedParams.limit;

    // Execute search query
    const [studios, totalCount] = await Promise.all([
      db.studio.findMany({
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
      db.studio.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const hasNextPage = validatedParams.page < totalPages;
    const hasPrevPage = validatedParams.page > 1;

    const response = {
      studios,
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
        studioType: validatedParams.studioType,
        services: validatedParams.services,
      },
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
