import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/email-service';
import { renderResolvedEmailTemplate, validateTemplatePlaceholders } from '@/lib/email/render';
import { templatePreviewSchema, resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { loadResolvedTemplate, freezeTemplateSender, EmailAdminError } from '@/lib/email/template-store';
import { emailAdminFailure } from '@/lib/email/admin-api';

const schema = templatePreviewSchema.extend({ recipientEmail: z.string().trim().toLowerCase().pipe(z.email()) });
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const raw = await request.json();
    const input = schema.parse(raw);
    const saved = await loadResolvedTemplate(input.templateKey);
    const supplied = new Set(Object.keys(raw.draft ?? {}));
    const patch = Object.fromEntries(Object.entries(input.draft ?? {}).filter(([key]) => supplied.has(key)));
    const template = freezeTemplateSender(resolvedEmailTemplateSchema.parse({ ...saved, ...patch }));
    const unknown = validateTemplatePlaceholders(template, template.variableSchema);
    if (unknown.length) throw new EmailAdminError(`Unknown placeholders: ${unknown.join(', ')}`);
    const rendered = renderResolvedEmailTemplate(template, input.variables);
    // Existing policy: an authorised admin may test any valid destination. Sample
    // preview/test data does not generate reset tokens or alter user preferences.
    const result = await sendEmail({ to: input.recipientEmail, subject: rendered.subject, html: rendered.html, text: rendered.text,
      from: template.fromName ? `${template.fromName} <${template.fromEmail}>` : template.fromEmail,
      ...(template.replyToEmail ? { replyTo: template.replyToEmail } : {}) });
    if (!result.success || !result.resendId) throw new EmailAdminError('The provider did not confirm test-email acceptance. Check the result before sending another test.', 502);
    return NextResponse.json({ success: true, providerId: result.resendId, source: input.draft ? 'draft' : 'saved' });
  } catch (error) { return emailAdminFailure(error, 'Failed to send test email'); }
}
