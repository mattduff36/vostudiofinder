import { z } from 'zod';

const integerQuery = (fallback: number, max: number) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(max)).default(fallback);
export const paymentListQuery = z.object({
  tab: z.enum(['one-time', 'subscriptions']).default('one-time'),
  page: integerQuery(1, 1_000_000), limit: integerQuery(50, 200),
  search: z.string().trim().max(250).default(''), status: z.string().default(''),
  user_id: z.string().max(200).optional(),
}).superRefine((value, context) => {
  const allowed = value.tab === 'one-time' ? ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PENDING', 'FAILED'] : ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'SUSPENDED'];
  if (value.status && !allowed.includes(value.status)) context.addIssue({ code: 'custom', path: ['status'], message: 'Unsupported status filter' });
});

export function parseRefundAmount(text: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647 ? value : null;
}
