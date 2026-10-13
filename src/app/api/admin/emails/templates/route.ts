import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { EMAIL_TEMPLATES, getTemplateDefinition } from '@/lib/email/template-registry';
import { validateTemplatePlaceholders } from '@/lib/email/render';
import { createEmailTemplateSchema, resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { resolveTemplateRecord, templateStorageData, recordTemplateVersion, EmailAdminError } from '@/lib/email/template-store';
import { unsupportedCampaignVariables } from '@/lib/email/recipient-service';
import { emailAdminFailure } from '@/lib/email/admin-api';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await db.email_templates.findMany({ orderBy: [{ created_at: 'desc' }, { key: 'asc' }] });
    const byKey = new Map(records.map(record => [record.key, record]));
    const keys = [...new Set([...EMAIL_TEMPLATES.map(def => def.key), ...records.map(record => record.key)])];
    const templates = keys.map(key => {
      const record = byKey.get(key) ?? null;
      const resolved = resolveTemplateRecord(key, record);
      return { ...resolved, hasDbOverride: !!record, updatedAt: record?.updated_at,
        campaignSupported: unsupportedCampaignVariables(resolved).length === 0 };
    });
    return NextResponse.json({ templates });
  } catch (error) { return emailAdminFailure(error, 'Failed to fetch templates'); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const input = createEmailTemplateSchema.parse(await request.json());
    if (getTemplateDefinition(input.key)) throw new EmailAdminError('This key belongs to an existing template. Edit that template instead.', 409);
    const template = resolvedEmailTemplateSchema.parse({ ...input, revision: 1, isSystem: false });
    const unknown = validateTemplatePlaceholders(template, template.variableSchema);
    if (unknown.length) throw new EmailAdminError(`Unknown placeholders: ${unknown.join(', ')}`);
    await db.$transaction(async tx => {
      const record = await tx.email_templates.create({ data: { ...templateStorageData(template), created_by_id: session.user.id, updated_by_id: session.user.id } });
      await recordTemplateVersion(tx, record.id, template, session.user.id);
    });
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) { return emailAdminFailure(error, 'Failed to create template'); }
}
