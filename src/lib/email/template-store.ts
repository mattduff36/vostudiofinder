import type { email_templates, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getTemplateDefinition } from './template-registry';
import { resolvedEmailTemplateSchema, type ResolvedEmailTemplate } from './template-contract';
import { defaultEmailFooter } from './layouts/footer';

export class EmailAdminError extends Error {
  constructor(message: string, public readonly status: number = 400) { super(message); }
}
export type EmailDb = Pick<Prisma.TransactionClient, 'users' | 'email_templates' | 'email_campaigns' | 'email_deliveries' | 'email_template_versions' | 'email_preferences'>;

/** A present override is authoritative, including blank optional copy fields. */
export function resolveTemplateRecord(key: string, record: email_templates | null): ResolvedEmailTemplate {
  const definition = getTemplateDefinition(key);
  if (!record && !definition) throw new EmailAdminError('Template not found', 404);
  if (!record) return resolvedEmailTemplateSchema.parse({ ...definition, revision: 0 });
  return resolvedEmailTemplateSchema.parse({
    key: record.key, name: record.name, description: record.description ?? '',
    layout: record.layout, isMarketing: record.is_marketing, isSystem: !!definition?.isSystem || record.is_system,
    subject: record.subject, preheader: record.preheader ?? '', heading: record.heading,
    bodyParagraphs: record.body_paragraphs, bulletItems: record.bullet_items,
    ctaPrimaryLabel: record.cta_primary_label ?? '', ctaPrimaryUrl: record.cta_primary_url ?? '',
    ctaSecondaryLabel: record.cta_secondary_label ?? '', ctaSecondaryUrl: record.cta_secondary_url ?? '',
    footerText: record.footer_text ?? '', fromName: record.from_name ?? '',
    fromEmail: record.from_email ?? '', replyToEmail: record.reply_to_email ?? '',
    variableSchema: record.variable_schema, revision: record.revision,
    heroImageUrl: definition?.heroImageUrl ?? '', heroImageAlt: definition?.heroImageAlt ?? '',
  });
}

export async function loadResolvedTemplate(key: string, client: EmailDb = db): Promise<ResolvedEmailTemplate> {
  // A DB outage is an error, not permission to send different default content.
  return resolveTemplateRecord(key, await client.email_templates.findUnique({ where: { key } }));
}

export function templateStorageData(template: ResolvedEmailTemplate) {
  return {
    key: template.key, name: template.name, description: template.description,
    layout: template.layout, is_marketing: template.isMarketing, is_system: template.isSystem,
    from_name: template.fromName, from_email: template.fromEmail, reply_to_email: template.replyToEmail,
    subject: template.subject, preheader: template.preheader, heading: template.heading,
    body_paragraphs: template.bodyParagraphs, bullet_items: template.bulletItems,
    cta_primary_label: template.ctaPrimaryLabel, cta_primary_url: template.ctaPrimaryUrl,
    cta_secondary_label: template.ctaSecondaryLabel, cta_secondary_url: template.ctaSecondaryUrl,
    footer_text: template.footerText, variable_schema: template.variableSchema, revision: template.revision,
  };
}

export async function recordTemplateVersion(client: EmailDb, id: string, template: ResolvedEmailTemplate, actorId: string) {
  const { key: _key, name: _name, description: _description, layout: _layout, is_marketing: _marketing,
    is_system: _system, variable_schema: _schema, revision, ...copy } = templateStorageData(template);
  return client.email_template_versions.create({ data: {
    ...copy, template_id: id, version_number: revision, created_by_id: actorId,
    snapshot: JSON.parse(JSON.stringify(template)) as Prisma.InputJsonValue,
  } });
}

/** Freeze resolved sender defaults along with content for a new campaign. */
export function freezeTemplateSender(template: ResolvedEmailTemplate): ResolvedEmailTemplate {
  return { ...template,
    fromEmail: template.fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@voiceoverstudiofinder.com',
    replyToEmail: template.replyToEmail || process.env.RESEND_REPLY_TO_EMAIL || '',
    footerText: template.footerText || defaultEmailFooter(),
  };
}
