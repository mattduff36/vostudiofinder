/**
 * GET /api/admin/emails/campaigns
 * List all campaigns
 * 
 * POST /api/admin/emails/campaigns
 * Create a new campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  templateKey: z.string(),
  filters: z.record(z.any()),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET() {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const campaigns = await db.email_campaigns.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        created_by: {
          select: {
            display_name: true,
            email: true,
          },
        },
        template: {
          select: {
            name: true,
            is_marketing: true,
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });
    
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const validated = createCampaignSchema.parse(body);
    
    // Verify template exists
    const template = await db.email_templates.findUnique({
      where: { key: validated.templateKey },
      select: { is_marketing: true },
    });
    
    if (!template) {
      // Check if it's in registry
      const { getTemplateDefinition } = await import('@/lib/email/template-registry');
      const defaultTemplate = getTemplateDefinition(validated.templateKey);
      if (!defaultTemplate) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    }
    
    // Count recipients matching filters
    const where = buildUserWhereClause(validated.filters);
    const recipientCount = await db.users.count({ where });
    
    if (recipientCount === 0) {
      return NextResponse.json(
        { error: 'No users match the specified filters' },
        { status: 400 }
      );
    }
    
    // Create campaign
    const campaign = await db.email_campaigns.create({
      data: {
        name: validated.name,
        template_key: validated.templateKey,
        filters: validated.filters,
        recipient_count: recipientCount,
        status: validated.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduled_at: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        created_by_id: session.user.id,
      },
    });
    
    console.log(`✅ Created campaign: ${validated.name} (${recipientCount} recipients)`);
    
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
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
