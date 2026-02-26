/**
 * POST /api/admin/emails/campaigns/[id]/start
 * Start sending a campaign (marks as SENDING and creates deliveries)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    // Get campaign
    const campaign = await db.email_campaigns.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            is_marketing: true,
          },
        },
      },
    });
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Campaign has already been sent or is in progress' },
        { status: 400 }
      );
    }
    
    // Get recipients matching filters
    const where = buildUserWhereClause(campaign.filters);
    
    // For marketing campaigns, enforce opt-in
    // Include users with no preferences record (default opt-in) OR users who explicitly opted in
    if (campaign.template.is_marketing) {
      const marketingOptInConditions = [
        // Users without email_preferences record (default opt-in)
        {
          email_preferences: null,
        },
        // Users with explicit opt-in and not unsubscribed
        {
          email_preferences: {
            marketing_opt_in: true,
            unsubscribed_at: null,
          },
        },
      ];
      
      // If there's already an OR clause (e.g., from search filter), wrap both in AND
      if (where.OR) {
        // Combine existing OR with marketing OR using AND
        where.AND = [
          { OR: where.OR }, // Existing search filter
          { OR: marketingOptInConditions }, // Marketing opt-in filter
        ];
        delete where.OR; // Remove the top-level OR to avoid conflict
      } else {
        // No existing OR, just add marketing filter
        where.OR = marketingOptInConditions;
      }
    }
    
    const recipients = await db.users.findMany({
      where,
      select: {
        id: true,
        email: true,
      },
    });
    
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No eligible recipients found' },
        { status: 400 }
      );
    }
    
    // Guard: check for existing deliveries (prevents duplicates if called twice)
    const existingDeliveries = await db.email_deliveries.count({
      where: { campaign_id: campaign.id },
    });
    if (existingDeliveries > 0) {
      return NextResponse.json(
        { error: 'Deliveries already exist for this campaign. It may have already been started.' },
        { status: 400 }
      );
    }

    await db.email_deliveries.createMany({
      data: recipients.map(user => ({
        campaign_id: campaign.id,
        user_id: user.id,
        to_email: user.email.toLowerCase().trim(),
        status: 'PENDING',
      })),
    });

    await db.email_campaigns.update({
      where: { id },
      data: {
        status: 'SENDING',
        started_at: new Date(),
        recipient_count: recipients.length,
      },
    });
    
    console.log(`✅ Started campaign: ${campaign.name} (${recipients.length} recipients)`);
    
    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to start campaign' },
      { status: 500 }
    );
  }
}

/**
 * Build Prisma where clause from filters object
 */
function buildUserWhereClause(filters: any): Prisma.usersWhereInput {
  const where: Prisma.usersWhereInput = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.emailVerified !== undefined) {
    where.email_verified = filters.emailVerified;
  }
  
  if (filters.hasStudio !== undefined) {
    if (filters.hasStudio) {
      // User HAS a studio - can apply additional filters
      const studioFilter: any = { isNot: null };
      
      if (filters.studioVerified !== undefined) {
        studioFilter.verified = filters.studioVerified;
      }
      
      if (filters.studioFeatured !== undefined) {
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
    
    if (filters.studioVerified !== undefined) {
      studioFilter.verified = filters.studioVerified;
    }
    
    if (filters.studioFeatured !== undefined) {
      studioFilter.is_featured = filters.studioFeatured;
    }
    
    if (Object.keys(studioFilter).length > 0) {
      where.studio_profiles = studioFilter;
    }
  }
  
  if (filters.marketingOptIn !== undefined) {
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
  
  if (filters.createdAfter && filters.createdBefore) {
    where.created_at = {
      gte: new Date(filters.createdAfter),
      lte: new Date(filters.createdBefore),
    };
  } else if (filters.createdAfter) {
    where.created_at = {
      gte: new Date(filters.createdAfter),
    };
  } else if (filters.createdBefore) {
    where.created_at = {
      lte: new Date(filters.createdBefore),
    };
  }
  
  if (filters.lastLoginAfter && filters.lastLoginBefore) {
    where.last_login = {
      gte: new Date(filters.lastLoginAfter),
      lte: new Date(filters.lastLoginBefore),
    };
  } else if (filters.lastLoginAfter) {
    where.last_login = {
      gte: new Date(filters.lastLoginAfter),
    };
  } else if (filters.lastLoginBefore) {
    where.last_login = {
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
  
  return where;
}
