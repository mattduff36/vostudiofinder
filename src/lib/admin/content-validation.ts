import { z } from 'zod';

export const faqFields = z.object({ question: z.string().trim().min(1).max(1000), answer: z.string().trim().min(1).max(20000), sort_order: z.number().int().min(0).max(100000).optional() });
export const messageTemplateFields = z.object({ label: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(20000) });
export const releaseDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Choose a valid calendar date');
export const platformUpdateFields = z.object({ title: z.string().trim().max(250).nullable().optional(), description: z.string().trim().min(1).max(20000),
  category: z.enum(['FEATURE', 'IMPROVEMENT', 'FIX', 'SECURITY']), release_date: releaseDate, is_highlighted: z.boolean().optional() });

export const faqReorderInput = z.object({
  faqs: z.array(z.object({ id: z.string().min(1).max(100), sort_order: z.number().int().positive() }).strict()).max(10000),
  expectedOrder: z.array(z.string().min(1).max(100)).max(10000),
}).strict().refine(value => new Set(value.faqs.map(faq => faq.id)).size === value.faqs.length
  && new Set(value.expectedOrder).size === value.expectedOrder.length
  && value.faqs.length === value.expectedOrder.length
  && value.faqs.every((faq, index) => faq.sort_order === index + 1 && value.expectedOrder.includes(faq.id)),
  'Submit each FAQ exactly once, in consecutive positions');

export async function readContentResponse(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The change could not be saved. Please try again.');
  return body;
}
