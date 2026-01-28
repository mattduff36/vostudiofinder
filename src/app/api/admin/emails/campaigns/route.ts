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
  filters: z.record(z.string(), z.any()),
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
    let template = await db.email_templates.findUnique({
      where: { key: validated.templateKey },
      select: { is_marketing: true, key: true },
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
      
      // Create DB entry for registry template to satisfy foreign key constraint
      template = await db.email_templates.create({
        data: {
          key: validated.templateKey,
          name: defaultTemplate.name,
          description: defaultTemplate.description,
          layout: defaultTemplate.layout,
          is_marketing: defaultTemplate.isMarketing,
          is_system: defaultTemplate.isSystem,
          from_name: defaultTemplate.fromName ?? null,
          from_email: defaultTemplate.fromEmail ?? null,
          reply_to_email: defaultTemplate.replyToEmail ?? null,
          subject: defaultTemplate.subject,
          preheader: defaultTemplate.preheader ?? null,
          heading: defaultTemplate.heading ?? null,
          body_paragraphs: defaultTemplate.bodyParagraphs,
          bullet_items: defaultTemplate.bulletItems || [],
          cta_primary_label: defaultTemplate.ctaPrimaryLabel ?? null,
          cta_primary_url: defaultTemplate.ctaPrimaryUrl ?? null,
          cta_secondary_label: defaultTemplate.ctaSecondaryLabel ?? null,
          cta_secondary_url: defaultTemplate.ctaSecondaryUrl ?? null,
          footer_text: defaultTemplate.footerText ?? null,
          variable_schema: defaultTemplate.variableSchema ?? null,
          created_by_id: session.user.id,
          updated_by_id: session.user.id,
        },
      });
      
      console.log(`✅ Created DB entry for registry template: ${validated.templateKey}`);
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
        { error: 'Invalid input', details: error.issues },
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
    const searchConditions = [
      { email: { contains: filters.search, mode: 'insensitive' as const } },
      { username: { contains: filters.search, mode: 'insensitive' as const } },
      { display_name: { contains: filters.search, mode: 'insensitive' as const } },
    ];
    
    // If there's already an OR clause (e.g., from marketing opt-in filter), wrap both in AND
    if (where.OR) {
      where.AND = [
        { OR: where.OR }, // Existing OR clause
        { OR: searchConditions }, // Search filter
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }
  
  return where;
}
