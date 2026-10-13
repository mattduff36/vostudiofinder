import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTemplateDefinition } from '@/lib/email/template-registry';
import { validateTemplatePlaceholders } from '@/lib/email/render';
import { updateEmailTemplateSchema, resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { resolveTemplateRecord, templateStorageData, recordTemplateVersion, EmailAdminError } from '@/lib/email/template-store';
import { emailAdminFailure } from '@/lib/email/admin-api';

interface RouteParams { params: Promise<{ key: string }> }
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { key } = await params;
    const record = await db.email_templates.findUnique({ where: { key }, include: {
      versions: { orderBy: { version_number: 'desc' }, take: 10,
        select: { id: true, version_number: true, created_at: true, created_by: { select: { display_name: true } } } },
    } });
    const resolved = resolveTemplateRecord(key, record);
    return NextResponse.json({ template: { ...resolved, defaultTemplate: getTemplateDefinition(key) ?? null,
      hasDbOverride: !!record, versions: record?.versions ?? [], updatedAt: record?.updated_at } });
  } catch (error) { return emailAdminFailure(error, 'Failed to fetch template'); }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { key } = await params;
    const raw: unknown = await request.json();
    const input = updateEmailTemplateSchema.parse(raw);
    // Zod defaults on optional copy fields must not turn omitted PATCH fields into clears.
    const provided = new Set(Object.keys(raw as object));
    const patch = Object.fromEntries(Object.entries(input).filter(([field]) => provided.has(field) && field !== 'revision'));
    const template = await db.$transaction(async tx => {
      const record = await tx.email_templates.findUnique({ where: { key } });
      const current = resolveTemplateRecord(key, record);
      if (current.revision !== input.revision) throw new EmailAdminError('This template has changed. Your draft is retained; reload the saved version before merging your changes.', 409);
      const updated = resolvedEmailTemplateSchema.parse({ ...current, ...patch, revision: current.revision + 1 });
      const unknown = validateTemplatePlaceholders(updated, updated.variableSchema);
      if (unknown.length) throw new EmailAdminError(`Unknown placeholders: ${unknown.join(', ')}`);
      let templateId: string;
      if (record) {
        const result = await tx.email_templates.updateMany({ where: { id: record.id, revision: input.revision },
          data: { ...templateStorageData(updated), updated_by_id: session.user.id } });
        if (result.count !== 1) throw new EmailAdminError('This template changed during saving. Review the latest version.', 409);
        templateId = record.id;
      } else {
        const created = await tx.email_templates.create({ data: { ...templateStorageData(updated), created_by_id: session.user.id, updated_by_id: session.user.id } });
        templateId = created.id;
      }
      await recordTemplateVersion(tx, templateId, updated, session.user.id);
      return updated;
    }, { isolationLevel: 'Serializable' });
    return NextResponse.json({ success: true, template });
  } catch (error) { return emailAdminFailure(error, 'Failed to update template'); }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { key } = await params;
    await db.$transaction(async tx => {
      const record = await tx.email_templates.findUnique({ where: { key } });
      if (getTemplateDefinition(key)?.isSystem || record?.is_system) throw new EmailAdminError('Cannot delete system templates');
      if (!record) throw new EmailAdminError('Template not found', 404);
      await tx.email_templates.delete({ where: { key } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return emailAdminFailure(error, 'Failed to delete template'); }
}
