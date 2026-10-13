/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: {} }));
import { buildRecipientWhere, parseRecipientQuery, parseStoredAudience, isMarketingEligible } from '@/lib/email/recipients';
import { resolveCampaignAudience, emailOperationHash } from '@/lib/email/recipient-service';
import { resolvedEmailTemplateSchema } from '@/lib/email/template-contract';

const template = resolvedEmailTemplateSchema.parse({ key: 'announcement', name: 'Announcement', subject: 'Hello', heading: 'Hello', bodyParagraphs: ['Hello {{displayName}}'], layout: 'STANDARD', isMarketing: true, isSystem: false, revision: 2, variableSchema: { displayName: 'string' } });

test('search, explicit opt-in and marketing eligibility are independent predicates', () => {
  const where = buildRecipientWhere({ mode: 'filters', filters: { search: 'Pat', marketingOptIn: false, studioVerified: true } }, true);
  const and = where.AND as unknown[];
  expect(and).toContainEqual({ email_preferences: { is: { marketing_opt_in: false } } });
  expect(and).toContainEqual({ studio_profiles: { is: { is_verified: true } } });
  expect(and.some(item => JSON.stringify(item).includes('"contains":"Pat"'))).toBe(true);
  expect(and.some(item => JSON.stringify(item).includes('"unsubscribed_at":null'))).toBe(true);
  expect(where).not.toHaveProperty('OR');
});

test('No Studio ignores incompatible studio filters without changing other conditions', () => {
  expect(buildRecipientWhere({ mode: 'filters', filters: { hasStudio: false, studioVerified: true, studioFeatured: true, emailVerified: false } })).toEqual({ AND: [
    { email_verified: false }, { studio_profiles: { is: null } },
  ] });
});

test('date-only end includes the entire UTC day; impossible, reversed and unrecognised filters fail', () => {
  const input = parseRecipientQuery(new URLSearchParams('createdAfter=2026-10-01&createdBefore=2026-10-13&page=2&limit=50'));
  expect(buildRecipientWhere({ mode: 'filters', filters: input.filters })).toEqual({ AND: [{ created_at: { gte: new Date('2026-10-01T00:00:00Z'), lt: new Date('2026-10-14T00:00:00Z') } }] });
  for (const query of ['createdAfter=2026-02-31', 'createdAfter=2026-10-13&createdBefore=2026-10-01', 'page=0', 'limit=NaN', 'emailVerified=yes', 'verified=true']) {
    expect(() => parseRecipientQuery(new URLSearchParams(query))).toThrow();
  }
  expect(() => parseStoredAudience({ unknownLegacyFilter: 'yes' })).toThrow();
});

test('absent preference defaults remain opt-in; unsubscribe remains ineligible', () => {
  expect(isMarketingEligible(null)).toBe(true);
  expect(isMarketingEligible({ marketing_opt_in: true, unsubscribed_at: null })).toBe(true);
  expect(isMarketingEligible({ marketing_opt_in: false, unsubscribed_at: null })).toBe(false);
  expect(isMarketingEligible({ marketing_opt_in: true, unsubscribed_at: new Date() })).toBe(false);
});

test('review counts excluded, missing, deleted, opted-out and duplicate addresses and pins identity', async () => {
  const user = (id: string, email: string, extra = {}) => ({ id, email, deletion_status: 'ACTIVE', email_preferences: null, ...extra });
  const rows = [
    user('a', 'one@example.invalid'), user('b', ' ONE@EXAMPLE.INVALID '), user('c', 'out@example.invalid', { email_preferences: { marketing_opt_in: false, unsubscribed_at: null } }),
    user('d', 'deleted@example.invalid', { deletion_status: 'PENDING_DELETION' }), user('e', 'excluded@example.invalid'),
  ];
  const client = { users: { findMany: jest.fn().mockResolvedValue(rows) } };
  const audience = { mode: 'selected' as const, userIds: ['a', 'b', 'c', 'd', 'e', 'missing'], excludedEmails: ['EXCLUDED@example.invalid'] };
  const review = await resolveCampaignAudience(audience, template, client as never);
  expect(review.recipients).toEqual([{ id: 'a', email: 'one@example.invalid' }]);
  expect(review.eligibleCount).toBe(1);
  expect(review.exclusions).toEqual({ missingUsers: 1, explicit: 1, consent: 1, deletionHold: 1, duplicateAddress: 1, invalidAddress: 0 });
  rows[0]!.id = 'replacement';
  const changed = await resolveCampaignAudience(audience, template, client as never);
  expect(changed.eligibleCount).toBe(review.eligibleCount);
  expect(changed.audienceFingerprint).not.toBe(review.audienceFingerprint);
  expect(emailOperationHash({ b: 2, a: 1 })).toBe(emailOperationHash({ a: 1, b: 2 }));
});
