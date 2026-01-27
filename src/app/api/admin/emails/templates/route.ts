/**
 * GET /api/admin/emails/templates
 * List all email templates (from registry + DB overrides)
 * 
 * POST /api/admin/emails/templates
 * Create a new custom template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { EMAIL_TEMPLATES } from '@/lib/email/template-registry';
import { validateTemplatePlaceholders } from '@/lib/email/render';
import { z } from 'zod';

const createTemplateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Key must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  layout: z.enum(['STANDARD', 'HERO']),
  isMarketing: z.boolean(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyToEmail: z.string().email().optional(),
  subject: z.string().min(1),
  preheader: z.string().optional(),
  heading: z.string().min(1),
  bodyParagraphs: z.array(z.string()),
  bulletItems: z.array(z.string()).optional(),
  ctaPrimaryLabel: z.string().optional(),
  ctaPrimaryUrl: z.string().optional(),
  ctaSecondaryLabel: z.string().optional(),
  ctaSecondaryUrl: z.string().optional(),
  footerText: z.string().optional(),
  variableSchema: z.record(z.enum(['string', 'url', 'email', 'number', 'date'])),
});

export async function GET() {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get all templates from DB
    const dbTemplates = await db.email_templates.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        created_by: {
          select: {
            display_name: true,
            email: true,
          },
        },
        updated_by: {
          select: {
            display_name: true,
            email: true,
          },
        },
      },
    });
    
    // Build list combining registry defaults with DB overrides
    const templates = EMAIL_TEMPLATES.map(def => {
      const dbOverride = dbTemplates.find(t => t.key === def.key);
      
      return {
        key: def.key,
        name: dbOverride?.name || def.name,
        description: dbOverride?.description || def.description,
        layout: dbOverride?.layout || def.layout,
        isMarketing: dbOverride?.is_marketing ?? def.isMarketing,
        isSystem: def.isSystem,
        hasDbOverride: !!dbOverride,
        fromName: dbOverride?.from_name || def.fromName,
        fromEmail: dbOverride?.from_email || def.fromEmail,
        replyToEmail: dbOverride?.reply_to_email || def.replyToEmail,
        subject: dbOverride?.subject || def.subject,
        preheader: dbOverride?.preheader || def.preheader,
        heading: dbOverride?.heading || def.heading,
        bodyParagraphs: dbOverride?.body_paragraphs || def.bodyParagraphs,
        bulletItems: dbOverride?.bullet_items || def.bulletItems,
        ctaPrimaryLabel: dbOverride?.cta_primary_label || def.ctaPrimaryLabel,
        ctaPrimaryUrl: dbOverride?.cta_primary_url || def.ctaPrimaryUrl,
        ctaSecondaryLabel: dbOverride?.cta_secondary_label || def.ctaSecondaryLabel,
        ctaSecondaryUrl: dbOverride?.cta_secondary_url || def.ctaSecondaryUrl,
        footerText: dbOverride?.footer_text || def.footerText,
        variableSchema: dbOverride?.variable_schema || def.variableSchema,
        createdBy: dbOverride?.created_by,
        updatedBy: dbOverride?.updated_by,
        updatedAt: dbOverride?.updated_at,
      };
    });
    
    // Add any custom templates not in registry
    const customTemplates = dbTemplates.filter(
      t => !EMAIL_TEMPLATES.some(def => def.key === t.key)
    );
    
    customTemplates.forEach(t => {
      templates.push({
        key: t.key,
        name: t.name,
        description: t.description || undefined,
        layout: t.layout,
        isMarketing: t.is_marketing,
        isSystem: false,
        hasDbOverride: true,
        fromName: t.from_name || undefined,
        fromEmail: t.from_email || undefined,
        replyToEmail: t.reply_to_email || undefined,
        subject: t.subject,
        preheader: t.preheader || undefined,
        heading: t.heading,
        bodyParagraphs: t.body_paragraphs,
        bulletItems: t.bullet_items.length > 0 ? t.bullet_items : undefined,
        ctaPrimaryLabel: t.cta_primary_label || undefined,
        ctaPrimaryUrl: t.cta_primary_url || undefined,
        ctaSecondaryLabel: t.cta_secondary_label || undefined,
        ctaSecondaryUrl: t.cta_secondary_url || undefined,
        footerText: t.footer_text || undefined,
        variableSchema: t.variable_schema,
        createdBy: t.created_by,
        updatedBy: t.updated_by,
        updatedAt: t.updated_at,
      });
    });
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
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
    const validated = createTemplateSchema.parse(body);
    
    // Check if key already exists
    const existing = await db.email_templates.findUnique({
      where: { key: validated.key },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Template with this key already exists' },
        { status: 400 }
      );
    }
    
    // Validate placeholders
    const unknownPlaceholders = validateTemplatePlaceholders(
      {
        subject: validated.subject,
        preheader: validated.preheader,
        heading: validated.heading,
        bodyParagraphs: validated.bodyParagraphs,
        bulletItems: validated.bulletItems,
        ctaPrimaryLabel: validated.ctaPrimaryLabel,
        ctaPrimaryUrl: validated.ctaPrimaryUrl,
        ctaSecondaryLabel: validated.ctaSecondaryLabel,
        ctaSecondaryUrl: validated.ctaSecondaryUrl,
      },
      validated.variableSchema
    );
    
    if (unknownPlaceholders.length > 0) {
      return NextResponse.json(
        { 
          error: 'Unknown placeholders found',
          unknownPlaceholders,
        },
        { status: 400 }
      );
    }
    
    // Create template
    const template = await db.email_templates.create({
      data: {
        key: validated.key,
        name: validated.name,
        description: validated.description,
        layout: validated.layout,
        is_marketing: validated.isMarketing,
        is_system: false,
        from_name: validated.fromName,
        from_email: validated.fromEmail,
        reply_to_email: validated.replyToEmail,
        subject: validated.subject,
        preheader: validated.preheader,
        heading: validated.heading,
        body_paragraphs: validated.bodyParagraphs,
        bullet_items: validated.bulletItems || [],
        cta_primary_label: validated.ctaPrimaryLabel,
        cta_primary_url: validated.ctaPrimaryUrl,
        cta_secondary_label: validated.ctaSecondaryLabel,
        cta_secondary_url: validated.ctaSecondaryUrl,
        footer_text: validated.footerText,
        variable_schema: validated.variableSchema,
        created_by_id: session.user.id,
        updated_by_id: session.user.id,
      },
    });
    
    // Create initial version
    await db.email_template_versions.create({
      data: {
        template_id: template.id,
        version_number: 1,
        subject: validated.subject,
        preheader: validated.preheader,
        heading: validated.heading,
        body_paragraphs: validated.bodyParagraphs,
        bullet_items: validated.bulletItems || [],
        cta_primary_label: validated.ctaPrimaryLabel,
        cta_primary_url: validated.ctaPrimaryUrl,
        cta_secondary_label: validated.ctaSecondaryLabel,
        cta_secondary_url: validated.ctaSecondaryUrl,
        footer_text: validated.footerText,
        from_name: validated.fromName,
        from_email: validated.fromEmail,
        reply_to_email: validated.replyToEmail,
        created_by_id: session.user.id,
      },
    });
    
    console.log(`✅ Created template: ${validated.key}`);
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
