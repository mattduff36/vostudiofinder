/**
 * GET /api/admin/emails/users
 * List users with filters for recipient selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const filters = {
      status: searchParams.get('status') as 'PENDING' | 'ACTIVE' | 'EXPIRED' | null,
      emailVerified: searchParams.get('emailVerified') === 'true' ? true : 
                     searchParams.get('emailVerified') === 'false' ? false : null,
      hasStudio: searchParams.get('hasStudio') === 'true' ? true :
                 searchParams.get('hasStudio') === 'false' ? false : null,
      studioVerified: searchParams.get('studioVerified') === 'true' ? true :
                      searchParams.get('studioVerified') === 'false' ? false : null,
      studioFeatured: searchParams.get('studioFeatured') === 'true' ? true :
                      searchParams.get('studioFeatured') === 'false' ? false : null,
      marketingOptIn: searchParams.get('marketingOptIn') === 'true' ? true :
                      searchParams.get('marketingOptIn') === 'false' ? false : null,
      createdAfter: searchParams.get('createdAfter'),
      createdBefore: searchParams.get('createdBefore'),
      lastLoginAfter: searchParams.get('lastLoginAfter'),
      lastLoginBefore: searchParams.get('lastLoginBefore'),
      search: searchParams.get('search'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 500),
    };
    
    // Build where clause
    const where: Prisma.usersWhereInput = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.emailVerified !== null) {
      where.email_verified = filters.emailVerified;
    }
    
    if (filters.hasStudio !== null) {
      if (filters.hasStudio) {
        // User HAS a studio - can apply additional filters
        const studioFilter: any = { isNot: null };
        
        if (filters.studioVerified !== null) {
          studioFilter.verified = filters.studioVerified;
        }
        
        if (filters.studioFeatured !== null) {
          studioFilter.is_featured = filters.studioFeatured;
        }
        
        where.studio_profiles = studioFilter;
      } else {
        // User has NO studio - ignore studioVerified/studioFeatured filters
        where.studio_profiles = { is: null };
      }
    } else {
      // hasStudio not specified - can still filter by verified/featured if user HAS a studio
      const studioFilter: any = {};
      
      if (filters.studioVerified !== null) {
        studioFilter.verified = filters.studioVerified;
      }
      
      if (filters.studioFeatured !== null) {
        studioFilter.is_featured = filters.studioFeatured;
      }
      
      if (Object.keys(studioFilter).length > 0) {
        where.studio_profiles = studioFilter;
      }
    }
    
    if (filters.marketingOptIn !== null) {
      if (filters.marketingOptIn === true) {
        // Include users with explicit opt-in OR users without preferences (default opt-in)
        const marketingOptInConditions = [
          // Users without email_preferences record (default opt-in)
          {
            email_preferences: null,
          },
          // Users with explicit opt-in
          {
            email_preferences: {
              marketing_opt_in: true,
            },
          },
        ];
        
        // If there's already an OR clause (e.g., from search filter), wrap both in AND
        if (where.OR) {
          where.AND = [
            { OR: where.OR }, // Existing OR clause
            { OR: marketingOptInConditions }, // Marketing opt-in filter
          ];
          delete where.OR;
        } else {
          where.OR = marketingOptInConditions;
        }
      } else {
        // marketingOptIn === false: Only include users who explicitly opted out
        where.email_preferences = {
          marketing_opt_in: false,
        };
      }
    }
    
    if (filters.createdAfter) {
      where.created_at = {
        ...(where.created_at as any || {}),
        gte: new Date(filters.createdAfter),
      };
    }
    
    if (filters.createdBefore) {
      where.created_at = {
        ...(where.created_at as any || {}),
        lte: new Date(filters.createdBefore),
      };
    }
    
    if (filters.lastLoginAfter) {
      where.last_login = {
        ...(where.last_login as any || {}),
        gte: new Date(filters.lastLoginAfter),
      };
    }
    
    if (filters.lastLoginBefore) {
      where.last_login = {
        ...(where.last_login as any || {}),
        lte: new Date(filters.lastLoginBefore),
      };
    }
    
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { display_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    // Get total count
    const total = await db.users.count({ where });
    
    // Get paginated users
    const users = await db.users.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        email_verified: true,
        status: true,
        created_at: true,
        last_login: true,
        studio_profiles: {
          select: {
            id: true,
            name: true,
            is_featured: true,
          },
        },
        email_preferences: {
          select: {
            marketing_opt_in: true,
            unsubscribed_at: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });
    
    const totalPages = Math.ceil(total / filters.limit);
    
    return NextResponse.json({
      users,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
