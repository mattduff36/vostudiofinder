import { z } from 'zod';

export const variableTypeSchema = z.enum(['string', 'url', 'email', 'number', 'date']);
export const variableSchemaSchema = z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/), variableTypeSchema);
const header = z.string().max(1000).refine(value => !/[\r\n]/.test(value), 'Email headers cannot contain line breaks');
const optionalEmail = z.union([z.literal(''), z.email()]).default('');
const templateUrl = z.string().max(4000).refine(value => {
  if (!value) return true;
  if (/^\{\{\s*[A-Za-z][A-Za-z0-9_]*\s*\}\}$/.test(value)) return true;
  try { return ['https:', 'http:'].includes(new URL(value.replace(/\{\{[^}]+\}\}/g, 'example')).protocol); } catch { return false; }
}, 'Use an HTTP(S) URL or a URL placeholder');

export const templateCopySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(''),
  subject: header.min(1),
  preheader: z.string().max(2000).default(''),
  heading: z.string().min(1).max(1000),
  bodyParagraphs: z.array(z.string().max(20_000)).min(1).max(100),
  bulletItems: z.array(z.string().max(5000)).max(100).default([]),
  ctaPrimaryLabel: z.string().max(200).default(''),
  ctaPrimaryUrl: templateUrl.default(''),
  ctaSecondaryLabel: z.string().max(200).default(''),
  ctaSecondaryUrl: templateUrl.default(''),
  footerText: z.string().max(10_000).default(''),
  fromName: header.default(''),
  fromEmail: optionalEmail,
  replyToEmail: optionalEmail,
});
export type EmailTemplateCopy = z.infer<typeof templateCopySchema>;
// Draft storage accepts incomplete text; save/render boundaries still validate it.
export const templateDraftSchema = templateCopySchema.extend({
  name: z.string(), subject: z.string(), heading: z.string(),
  ctaPrimaryUrl: z.string(), ctaSecondaryUrl: z.string(),
  fromEmail: z.string(), replyToEmail: z.string(), bodyParagraphs: z.array(z.string()),
});

export const resolvedEmailTemplateSchema = templateCopySchema.extend({
  key: z.string().min(1).max(100),
  layout: z.enum(['STANDARD', 'HERO']),
  isMarketing: z.boolean(),
  isSystem: z.boolean(),
  variableSchema: variableSchemaSchema,
  revision: z.number().int().nonnegative(),
  heroImageUrl: z.string().default(''),
  heroImageAlt: z.string().default(''),
});
export type ResolvedEmailTemplate = z.infer<typeof resolvedEmailTemplateSchema>;

const reservedKeys = new Set(['new', 'create', 'edit', 'delete', 'preview', 'test']);
export const createEmailTemplateSchema = templateCopySchema.extend({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).refine(key => !reservedKeys.has(key), 'This template key is reserved'),
  layout: z.enum(['STANDARD', 'HERO']),
  isMarketing: z.boolean(),
  variableSchema: variableSchemaSchema,
}).strict();
export const updateEmailTemplateSchema = templateCopySchema.partial().extend({ revision: z.number().int().nonnegative() }).strict();
export const templatePreviewSchema = z.object({
  templateKey: z.string().min(1).max(100),
  variables: z.record(z.string(), z.union([z.string().max(20_000), z.number().finite()])),
  draft: templateCopySchema.partial().optional(),
}).strict();

/** Preview samples are never a production variable resolver. */
export function createSampleVariables(schema: Record<string, string>): Record<string, string | number> {
  const examples: Record<string, string | number> = {
    displayName: 'Sample Studio Owner', customerName: 'Sample Studio Owner', username: 'sample-studio',
    studioName: 'Sample Studio', category: 'Feedback', submittedAt: '12 October 2026, 12:00 UTC',
    message: 'This is a sample support message.', visibilityMessage: 'Your existing visibility choice is preserved.',
    paymentAmount: '30.00', refundAmount: '30.00', amount: '30.00', currency: 'GBP',
    paymentId: 'sample-payment', refundType: 'Sample refund', isFullRefund: 'no',
    profileCompletion: 75, daysRemaining: 7, expiryDate: '31 December 2026',
  };
  return Object.fromEntries(Object.entries(schema).map(([key, type]) => [key,
    type === 'url' ? `https://example.invalid/${encodeURIComponent(key)}` :
    type === 'email' ? 'sample@example.invalid' :
    type === 'number' ? (typeof examples[key] === 'number' ? examples[key] : 1) :
    type === 'date' ? '2026-12-31' : examples[key] ?? `Sample ${key}`,
  ]));
}
