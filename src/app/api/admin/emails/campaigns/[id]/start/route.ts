/**
 * POST /api/admin/emails/campaigns/[id]/start
 * Start sending a campaign (marks as SENDING and creates deliveries)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
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
    if (campaign.template.is_marketing) {
      where.email_preferences = {
        ...where.email_preferences,
        marketing_opt_in: true,
        unsubscribed_at: null,
      };
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
    
    // Create delivery records
    await db.email_deliveries.createMany({
      data: recipients.map(user => ({
        campaign_id: campaign.id,
        user_id: user.id,
        to_email: user.email,
        status: 'PENDING',
      })),
    });
    
    // Update campaign status
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
      where.studio_profiles = { isNot: null };
    } else {
      where.studio_profiles = { is: null };
    }
  }
  
  if (filters.studioVerified !== undefined) {
    where.studio_profiles = {
      ...where.studio_profiles,
      verified: filters.studioVerified,
    };
  }
  
  if (filters.studioFeatured !== undefined) {
    where.studio_profiles = {
      ...where.studio_profiles,
      is_featured: filters.studioFeatured,
    };
  }
  
  if (filters.marketingOptIn !== undefined) {
    where.email_preferences = {
      marketing_opt_in: filters.marketingOptIn,
    };
  }
  
  if (filters.createdAfter) {
    where.created_at = {
      ...where.created_at,
      gte: new Date(filters.createdAfter),
    };
  }
  
  if (filters.createdBefore) {
    where.created_at = {
      ...where.created_at,
      lte: new Date(filters.createdBefore),
    };
  }
  
  if (filters.lastLoginAfter) {
    where.last_login = {
      ...where.last_login,
      gte: new Date(filters.lastLoginAfter),
    };
  }
  
  if (filters.lastLoginBefore) {
    where.last_login = {
      ...where.last_login,
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
