import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { renderResolvedEmailTemplate, validateTemplatePlaceholders } from '@/lib/email/render';
import { templatePreviewSchema, resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { loadResolvedTemplate, EmailAdminError } from '@/lib/email/template-store';
import { emailAdminFailure } from '@/lib/email/admin-api';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const raw = await request.json();
    const input = templatePreviewSchema.parse(raw);
    const saved = await loadResolvedTemplate(input.templateKey);
    const supplied = new Set(Object.keys(raw.draft ?? {}));
    const patch = Object.fromEntries(Object.entries(input.draft ?? {}).filter(([key]) => supplied.has(key)));
    const template = resolvedEmailTemplateSchema.parse({ ...saved, ...patch });
    const unknown = validateTemplatePlaceholders(template, template.variableSchema);
    if (unknown.length) throw new EmailAdminError(`Unknown placeholders: ${unknown.join(', ')}`);
    const rendered = renderResolvedEmailTemplate(template, input.variables);
    return NextResponse.json({ html: rendered.html, text: rendered.text, subject: rendered.subject, source: input.draft ? 'draft' : 'saved' });
  } catch (error) { return emailAdminFailure(error, 'Failed to preview template'); }
}
