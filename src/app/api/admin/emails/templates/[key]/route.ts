/**
 * GET /api/admin/emails/templates/[key]
 * Get a single template by key
 * 
 * PATCH /api/admin/emails/templates/[key]
 * Update a template (creates new version)
 * 
 * DELETE /api/admin/emails/templates/[key]
 * Delete a custom template (system templates cannot be deleted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTemplateDefinition } from '@/lib/email/template-registry';
import { validateTemplatePlaceholders } from '@/lib/email/render';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  replyToEmail: z.string().email().optional(),
  subject: z.string().min(1).optional(),
  preheader: z.string().optional(),
  heading: z.string().min(1).optional(),
  bodyParagraphs: z.array(z.string()).optional(),
  bulletItems: z.array(z.string()).optional(),
  ctaPrimaryLabel: z.string().optional(),
  ctaPrimaryUrl: z.string().optional(),
  ctaSecondaryLabel: z.string().optional(),
  ctaSecondaryUrl: z.string().optional(),
  footerText: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { key } = await params;
    
    // Try to get from DB first
    const dbTemplate = await db.email_templates.findUnique({
      where: { key },
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
        versions: {
          orderBy: { version_number: 'desc' },
          take: 10,
          include: {
            created_by: {
              select: {
                display_name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    
    // Get default from registry
    const defaultTemplate = getTemplateDefinition(key);
    
    if (!dbTemplate && !defaultTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Build response
    const template = {
      key,
      name: dbTemplate?.name || defaultTemplate?.name,
      description: dbTemplate?.description || defaultTemplate?.description,
      layout: dbTemplate?.layout || defaultTemplate?.layout,
      isMarketing: dbTemplate?.is_marketing ?? defaultTemplate?.isMarketing,
      isSystem: defaultTemplate?.isSystem || false,
      hasDbOverride: !!dbTemplate,
      fromName: dbTemplate?.from_name || defaultTemplate?.fromName,
      fromEmail: dbTemplate?.from_email || defaultTemplate?.fromEmail,
      replyToEmail: dbTemplate?.reply_to_email || defaultTemplate?.replyToEmail,
      subject: dbTemplate?.subject || defaultTemplate?.subject,
      preheader: dbTemplate?.preheader || defaultTemplate?.preheader,
      heading: dbTemplate?.heading || defaultTemplate?.heading,
      bodyParagraphs: dbTemplate?.body_paragraphs || defaultTemplate?.bodyParagraphs,
      bulletItems: dbTemplate?.bullet_items || defaultTemplate?.bulletItems,
      ctaPrimaryLabel: dbTemplate?.cta_primary_label || defaultTemplate?.ctaPrimaryLabel,
      ctaPrimaryUrl: dbTemplate?.cta_primary_url || defaultTemplate?.ctaPrimaryUrl,
      ctaSecondaryLabel: dbTemplate?.cta_secondary_label || defaultTemplate?.ctaSecondaryLabel,
      ctaSecondaryUrl: dbTemplate?.cta_secondary_url || defaultTemplate?.ctaSecondaryUrl,
      footerText: dbTemplate?.footer_text || defaultTemplate?.footerText,
      variableSchema: dbTemplate?.variable_schema || defaultTemplate?.variableSchema,
      defaultTemplate: defaultTemplate ? {
        subject: defaultTemplate.subject,
        preheader: defaultTemplate.preheader,
        heading: defaultTemplate.heading,
        bodyParagraphs: defaultTemplate.bodyParagraphs,
        bulletItems: defaultTemplate.bulletItems,
        ctaPrimaryLabel: defaultTemplate.ctaPrimaryLabel,
        ctaPrimaryUrl: defaultTemplate.ctaPrimaryUrl,
        ctaSecondaryLabel: defaultTemplate.ctaSecondaryLabel,
        ctaSecondaryUrl: defaultTemplate.ctaSecondaryUrl,
        footerText: defaultTemplate.footerText,
      } : null,
      versions: dbTemplate?.versions || [],
      createdBy: dbTemplate?.created_by,
      updatedBy: dbTemplate?.updated_by,
      updatedAt: dbTemplate?.updated_at,
    };
    
    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { key } = await params;
    const body = await request.json();
    const validated = updateTemplateSchema.parse(body);
    
    // Get current template (DB or default)
    const dbTemplate = await db.email_templates.findUnique({
      where: { key },
    });
    
    const defaultTemplate = getTemplateDefinition(key);
    
    if (!dbTemplate && !defaultTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Build updated fields (merge with current)
    const current = dbTemplate || {
      name: defaultTemplate!.name,
      description: defaultTemplate!.description,
      layout: defaultTemplate!.layout,
      is_marketing: defaultTemplate!.isMarketing,
      is_system: defaultTemplate!.isSystem,
      from_name: defaultTemplate!.fromName,
      from_email: defaultTemplate!.fromEmail,
      reply_to_email: defaultTemplate!.replyToEmail,
      subject: defaultTemplate!.subject,
      preheader: defaultTemplate!.preheader,
      heading: defaultTemplate!.heading,
      body_paragraphs: defaultTemplate!.bodyParagraphs,
      bullet_items: defaultTemplate!.bulletItems || [],
      cta_primary_label: defaultTemplate!.ctaPrimaryLabel,
      cta_primary_url: defaultTemplate!.ctaPrimaryUrl,
      cta_secondary_label: defaultTemplate!.ctaSecondaryLabel,
      cta_secondary_url: defaultTemplate!.ctaSecondaryUrl,
      footer_text: defaultTemplate!.footerText,
      variable_schema: defaultTemplate!.variableSchema,
    };
    
    const updated = {
      name: validated.name ?? (typeof current.name === 'string' ? current.name : defaultTemplate!.name),
      description: validated.description ?? current.description,
      from_name: validated.fromName ?? current.from_name,
      from_email: validated.fromEmail ?? current.from_email,
      reply_to_email: validated.replyToEmail ?? current.reply_to_email,
      subject: validated.subject ?? current.subject,
      preheader: validated.preheader ?? current.preheader,
      heading: validated.heading ?? current.heading ?? defaultTemplate!.heading,
      body_paragraphs: validated.bodyParagraphs ?? current.body_paragraphs,
      bullet_items: validated.bulletItems ?? current.bullet_items,
      cta_primary_label: validated.ctaPrimaryLabel ?? current.cta_primary_label,
      cta_primary_url: validated.ctaPrimaryUrl ?? current.cta_primary_url,
      cta_secondary_label: validated.ctaSecondaryLabel ?? current.cta_secondary_label,
      cta_secondary_url: validated.ctaSecondaryUrl ?? current.cta_secondary_url,
      footer_text: validated.footerText ?? current.footer_text,
    };
    
    // Validate placeholders
    const variableSchema = (dbTemplate?.variable_schema || defaultTemplate!.variableSchema) as Record<string, string>;
    
    // Build template copy object with only defined properties
    const templateCopy: any = {
      subject: updated.subject,
      heading: updated.heading,
      bodyParagraphs: updated.body_paragraphs,
      bulletItems: updated.bullet_items,
    };
    
    if (updated.preheader) templateCopy.preheader = updated.preheader;
    if (updated.cta_primary_label) templateCopy.ctaPrimaryLabel = updated.cta_primary_label;
    if (updated.cta_primary_url) templateCopy.ctaPrimaryUrl = updated.cta_primary_url;
    if (updated.cta_secondary_label) templateCopy.ctaSecondaryLabel = updated.cta_secondary_label;
    if (updated.cta_secondary_url) templateCopy.ctaSecondaryUrl = updated.cta_secondary_url;
    if (updated.footer_text) templateCopy.footerText = updated.footer_text;
    
    const unknownPlaceholders = validateTemplatePlaceholders(
      templateCopy,
      variableSchema
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
    
    // Upsert template
    const template = await db.email_templates.upsert({
      where: { key },
      create: {
        key,
        name: updated.name,
        description: updated.description,
        layout: current.layout,
        is_marketing: current.is_marketing,
        is_system: defaultTemplate?.isSystem || false,
        from_name: updated.from_name ?? null,
        from_email: updated.from_email ?? null,
        reply_to_email: updated.reply_to_email ?? null,
        subject: updated.subject,
        preheader: updated.preheader ?? null,
        heading: updated.heading, // Required field - guaranteed to have value
        body_paragraphs: updated.body_paragraphs,
        bullet_items: updated.bullet_items,
        cta_primary_label: updated.cta_primary_label ?? null,
        cta_primary_url: updated.cta_primary_url ?? null,
        cta_secondary_label: updated.cta_secondary_label ?? null,
        cta_secondary_url: updated.cta_secondary_url ?? null,
        footer_text: updated.footer_text ?? null,
        variable_schema: variableSchema,
        created_by_id: session.user.id,
        updated_by_id: session.user.id,
      },
      update: {
        name: updated.name,
        description: updated.description,
        from_name: updated.from_name ?? null,
        from_email: updated.from_email ?? null,
        reply_to_email: updated.reply_to_email ?? null,
        subject: updated.subject,
        preheader: updated.preheader ?? null,
        heading: updated.heading, // Required field - guaranteed to have value
        body_paragraphs: updated.body_paragraphs,
        bullet_items: updated.bullet_items,
        cta_primary_label: updated.cta_primary_label ?? null,
        cta_primary_url: updated.cta_primary_url ?? null,
        cta_secondary_label: updated.cta_secondary_label ?? null,
        cta_secondary_url: updated.cta_secondary_url ?? null,
        footer_text: updated.footer_text ?? null,
        updated_by_id: session.user.id,
      },
    });
    
    // Create new version
    const latestVersion = await db.email_template_versions.findFirst({
      where: { template_id: template.id },
      orderBy: { version_number: 'desc' },
    });
    
    const newVersionNumber = (latestVersion?.version_number || 0) + 1;
    
    await db.email_template_versions.create({
      data: {
        template_id: template.id,
        version_number: newVersionNumber,
        subject: updated.subject,
        preheader: updated.preheader ?? null,
        heading: updated.heading, // Required field - guaranteed to have value
        body_paragraphs: updated.body_paragraphs,
        bullet_items: updated.bullet_items,
        cta_primary_label: updated.cta_primary_label ?? null,
        cta_primary_url: updated.cta_primary_url ?? null,
        cta_secondary_label: updated.cta_secondary_label ?? null,
        cta_secondary_url: updated.cta_secondary_url ?? null,
        footer_text: updated.footer_text ?? null,
        from_name: updated.from_name ?? null,
        from_email: updated.from_email ?? null,
        reply_to_email: updated.reply_to_email ?? null,
        created_by_id: session.user.id,
      },
    });
    
    console.log(`✅ Updated template: ${key} (v${newVersionNumber})`);
    
    return NextResponse.json({ success: true, template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify admin auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { key } = await params;
    
    // Check if it's a system template
    const defaultTemplate = getTemplateDefinition(key);
    if (defaultTemplate?.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 400 }
      );
    }
    
    // Delete from DB (cascade will delete versions)
    await db.email_templates.delete({
      where: { key },
    });
    
    console.log(`✅ Deleted template: ${key}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
