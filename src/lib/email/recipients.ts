import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { parseDateInputValueToIsoUtc } from '@/lib/date-input';

export const MAX_CAMPAIGN_RECIPIENTS = 10_000;
export const normalizeRecipientEmail = (value: string): string => value.trim().toLowerCase();
const dateOnly = z.string().refine(value => parseDateInputValueToIsoUtc(value) !== null, 'Use a valid YYYY-MM-DD date (UTC)');
const emailList = z.array(z.string().trim().toLowerCase().pipe(z.email())).max(MAX_CAMPAIGN_RECIPIENTS);
export const recipientFiltersSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED']).optional(),
  emailVerified: z.boolean().optional(),
  hasStudio: z.boolean().optional(),
  studioVerified: z.boolean().optional(),
  studioFeatured: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
  createdAfter: dateOnly.optional(), createdBefore: dateOnly.optional(),
  lastLoginAfter: dateOnly.optional(), lastLoginBefore: dateOnly.optional(),
  search: z.string().trim().max(200).optional(),
  excludedEmails: emailList.optional(),
}).strict().superRefine((value, context) => {
  for (const [after, before] of [[value.createdAfter, value.createdBefore], [value.lastLoginAfter, value.lastLoginBefore]]) {
    if (after && before && after > before) context.addIssue({ code: 'custom', message: 'Start date must be on or before end date' });
  }
});
export type RecipientFilters = z.infer<typeof recipientFiltersSchema>;
export const audienceSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('filters'), filters: recipientFiltersSchema }).strict(),
  z.object({
    mode: z.literal('selected'),
    userIds: z.array(z.string().min(1).max(100)).min(1).max(MAX_CAMPAIGN_RECIPIENTS).transform(ids => [...new Set(ids)].sort()),
    excludedEmails: emailList.optional(),
  }).strict(),
]);
export type AudienceSelection = z.infer<typeof audienceSelectionSchema>;

/** Old campaigns stored filters directly. Unknown fields must never widen scope. */
export function parseStoredAudience(input: unknown): AudienceSelection {
  if (input && typeof input === 'object' && 'mode' in input) return audienceSelectionSchema.parse(input);
  return { mode: 'filters', filters: recipientFiltersSchema.parse(input) };
}

export function parseRecipientQuery(params: URLSearchParams): { filters: RecipientFilters; page: number; limit: number } {
  const values: Record<string, unknown> = Object.fromEntries(params);
  const paging = z.object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
  }).parse({ page: values.page, limit: values.limit });
  delete values.page; delete values.limit;
  for (const key of ['emailVerified', 'hasStudio', 'studioVerified', 'studioFeatured', 'marketingOptIn']) {
    if (key in values) values[key] = z.enum(['true', 'false']).parse(values[key]) === 'true';
  }
  if (typeof values.excludedEmails === 'string') values.excludedEmails = values.excludedEmails.split(',').filter(Boolean);
  return { filters: recipientFiltersSchema.parse(values), ...paging };
}

export const marketingEligibilityWhere: Prisma.usersWhereInput = {
  OR: [
    { email_preferences: { is: null } },
    { email_preferences: { is: { marketing_opt_in: true, unsubscribed_at: null } } },
  ],
};

function dateRange(after?: string, before?: string): Prisma.DateTimeFilter | undefined {
  if (!after && !before) return undefined;
  return {
    ...(after ? { gte: new Date(parseDateInputValueToIsoUtc(after)!) } : {}),
    ...(before ? { lt: new Date(new Date(parseDateInputValueToIsoUtc(before)!).getTime() + 86_400_000) } : {}),
  };
}

/** Each independent condition occupies AND; search can never replace consent. */
export function buildRecipientWhere(audience: AudienceSelection, marketingRequired = false): Prisma.usersWhereInput {
  const and: Prisma.usersWhereInput[] = [];
  const filters = audience.mode === 'filters' ? audience.filters : {};
  if (audience.mode === 'selected') and.push({ id: { in: audience.userIds } });
  if (filters.status !== undefined) and.push({ status: filters.status });
  if (filters.emailVerified !== undefined) and.push({ email_verified: filters.emailVerified });
  if (filters.hasStudio === false) {
    and.push({ studio_profiles: { is: null } });
  } else {
    const studio: Prisma.studio_profilesWhereInput = {
      ...(filters.studioVerified !== undefined ? { is_verified: filters.studioVerified } : {}),
      ...(filters.studioFeatured !== undefined ? { is_featured: filters.studioFeatured } : {}),
    };
    if (filters.hasStudio || Object.keys(studio).length) and.push({ studio_profiles: { is: studio } });
  }
  if (filters.marketingOptIn === true) {
    // This is the existing preference filter, distinct from send eligibility.
    and.push({ OR: [{ email_preferences: { is: null } }, { email_preferences: { is: { marketing_opt_in: true } } }] });
  } else if (filters.marketingOptIn === false) {
    and.push({ email_preferences: { is: { marketing_opt_in: false } } });
  }
  if (marketingRequired) and.push(marketingEligibilityWhere);
  const created = dateRange(filters.createdAfter, filters.createdBefore);
  const lastLogin = dateRange(filters.lastLoginAfter, filters.lastLoginBefore);
  if (created) and.push({ created_at: created });
  if (lastLogin) and.push({ last_login: lastLogin });
  if (filters.search) and.push({ OR: [
    { email: { contains: filters.search, mode: 'insensitive' } },
    { username: { contains: filters.search, mode: 'insensitive' } },
    { display_name: { contains: filters.search, mode: 'insensitive' } },
  ] });
  const excluded = audience.mode === 'filters' ? filters.excludedEmails : audience.excludedEmails;
  if (excluded?.length) and.push({ NOT: { email: { in: [...new Set(excluded.map(normalizeRecipientEmail))], mode: 'insensitive' } } });
  return { AND: and };
}

export function isMarketingEligible(preferences: { marketing_opt_in: boolean; unsubscribed_at: Date | string | null } | null): boolean {
  return !preferences || (preferences.marketing_opt_in && !preferences.unsubscribed_at);
}
