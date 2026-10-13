/** @jest-environment node */
import type { email_deliveries } from '@prisma/client';
jest.mock('@/lib/db', () => ({ db: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  email_deliveries: { findUnique: jest.fn(), updateMany: jest.fn(), groupBy: jest.fn(), findFirst: jest.fn() },
  email_campaigns: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  users: { findUnique: jest.fn(), update: jest.fn() },
} }));
jest.mock('@/lib/email/campaign-provider', () => ({ ...jest.requireActual('@/lib/email/campaign-provider'), submitFrozenEmail: jest.fn() }));
jest.mock('@/lib/email/unsubscribe-token', () => ({ generateUnsubscribeToken: jest.fn().mockResolvedValue('stable-test-token') }));
import { db } from '@/lib/db';
import { submitFrozenEmail, IDEMPOTENCY_RECOVERY_WINDOW_MS } from '@/lib/email/campaign-provider';
import { processCampaignQueue, recordCampaignSubmission } from '@/lib/email/campaign-worker';
import { resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { emailOperationHash } from '@/lib/email/recipient-service';

const mocks = jest.mocked(db);
const submit = jest.mocked(submitFrozenEmail);
const template = resolvedEmailTemplateSchema.parse({ key: 'worker-fixture', name: 'Worker fixture', subject: 'Reviewed subject', heading: 'Hello', bodyParagraphs: ['Hello {{displayName}}'], layout: 'STANDARD', isMarketing: true, isSystem: false, revision: 1, variableSchema: { displayName: 'string' }, fromEmail: 'sender@example.invalid' });
const frozen = { from: 'sender@example.invalid', to: 'customer@example.invalid', subject: 'Frozen subject', html: '<p>Previously submitted copy</p>', text: 'Previously submitted copy' };
let row: email_deliveries;
let campaign: Record<string, unknown>;
let user: Record<string, unknown> | null;
const now = new Date('2026-10-13T12:00:00Z');

beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers().setSystemTime(now);
  process.env.EMAIL_CAMPAIGNS_ENABLED = 'true';
  row = { id: 'delivery-1', campaign_id: 'campaign-1', user_id: 'customer-1', reviewed_user_id: 'customer-1', normalized_recipient: 'customer@example.invalid', to_email: 'customer@example.invalid', status: 'SENDING', resend_id: null, error_message: null, sent_at: null, failed_at: null, opened_at: null, clicked_at: null, clicked_link: null, created_at: now, lease_token: 'claim-1', lease_expires_at: new Date(now.getTime() + 600_000), attempt_count: 0, next_attempt_at: null, submission_key: null, submission_payload: null, submission_payload_hash: null, first_submission_at: null, outcome_reason: null, retryable: false };
  campaign = { id: 'campaign-1', queue_version: 2, status: 'SENDING', template_snapshot: template, auto_retry: false, max_retries: 3 };
  user = { id: 'customer-1', email: row.to_email, display_name: 'Customer', username: 'customer', deletion_status: 'ACTIVE', studio_profiles: null, email_preferences: null };
  mocks.$transaction.mockImplementation(async callback => (callback as unknown as (client: typeof db) => Promise<unknown>)(db) as never);
  mocks.$queryRaw.mockImplementation(async () => [{ ...row }] as never);
  mocks.email_deliveries.findUnique.mockImplementation(async () => ({ ...row, campaign }) as never);
  mocks.email_deliveries.updateMany.mockImplementation(async args => {
    if (args.where?.lease_token !== row.lease_token || (args.where?.status && args.where.status !== row.status)) return { count: 0 };
    if (args.where?.first_submission_at === null && row.first_submission_at) return { count: 0 };
    const data = { ...args.data };
    if (data.attempt_count && typeof data.attempt_count === 'object') data.attempt_count = row.attempt_count + Number(data.attempt_count.increment ?? 0);
    row = { ...row, ...data } as email_deliveries;
    return { count: 1 };
  });
  mocks.email_deliveries.groupBy.mockImplementation(async () => [{ status: row.status, _count: 1 }] as never);
  mocks.email_deliveries.findFirst.mockResolvedValue(null);
  mocks.email_campaigns.findUnique.mockImplementation(async () => campaign as never);
  mocks.email_campaigns.findMany.mockResolvedValue([]);
  mocks.email_campaigns.update.mockImplementation(async args => ({ ...campaign, ...args.data }) as never);
  mocks.email_campaigns.updateMany.mockResolvedValue({ count: 0 });
  mocks.users.findUnique.mockImplementation(async () => user as never);
  submit.mockResolvedValue({ status: 'accepted', id: 'provider-accepted-1' });
});
afterEach(() => { jest.useRealTimers(); delete process.env.EMAIL_CAMPAIGNS_ENABLED; });

function previousSubmission(ageMs = 60_000) {
  row = { ...row, attempt_count: 1, first_submission_at: new Date(now.getTime() - ageMs), submission_key: 'campaign/delivery-1/1', submission_payload: frozen, submission_payload_hash: emailOperationHash(frozen) };
}

test.each([
  ['deleted relation', () => { row.user_id = null; }, 'recipient_deleted'],
  ['missing user', () => { user = null; }, 'recipient_deleted'],
  ['changed address', () => { user!.email = 'changed@example.invalid'; }, 'recipient_address_changed'],
  ['deletion hold', () => { user!.deletion_status = 'PENDING_DELETION'; }, 'recipient_deletion_hold'],
  ['opt-out', () => { user!.email_preferences = { marketing_opt_in: false, unsubscribed_at: null }; }, 'marketing_consent_withdrawn'],
  ['unsubscribe', () => { user!.email_preferences = { marketing_opt_in: true, unsubscribed_at: now }; }, 'marketing_consent_withdrawn'],
  ['cancel before submission', () => { campaign.status = 'CANCELLED'; }, 'campaign_cancelled'],
])('%s skips before provider submission', async (_label, change, reason) => {
  change(); await processCampaignQueue();
  expect(submit).not.toHaveBeenCalled(); expect(row.status).toBe('SKIPPED'); expect(row.outcome_reason).toBe(reason);
});

test('freezes payload/key before the provider call and records only a positive acceptance', async () => {
  submit.mockImplementation(async (payload, key) => {
    expect(row.submission_payload).toEqual(payload); expect(row.submission_key).toBe(key);
    expect(row.first_submission_at).toEqual(now); expect(row.status).toBe('SENDING');
    expect(payload.to).toBe('customer@example.invalid'); expect(payload.html).toContain('Hello Customer');
    return { status: 'accepted', id: 'provider-confirmed' };
  });
  await expect(processCampaignQueue()).resolves.toMatchObject({ sent: 1 });
  expect(row.status).toBe('SENT'); expect(row.resend_id).toBe('provider-confirmed'); expect(row.attempt_count).toBe(1);
});

test('uncertain recovery retains exact payload and key even after deletion/cancellation/template edits', async () => {
  previousSubmission(); row.user_id = null; campaign.status = 'CANCELLED'; campaign.template_snapshot = { ...template, subject: 'Edited later' };
  await processCampaignQueue();
  expect(submit).toHaveBeenCalledWith(frozen, 'campaign/delivery-1/1'); expect(mocks.users.findUnique).not.toHaveBeenCalled();
  expect(row.resend_id).toBe('provider-accepted-1');
});

test.each([IDEMPOTENCY_RECOVERY_WINDOW_MS, 24 * 60 * 60_000])('an ambiguous submission aged %d requires review without resending', async age => {
  previousSubmission(age); await processCampaignQueue();
  expect(submit).not.toHaveBeenCalled(); expect(row.status).toBe('UNCERTAIN'); expect(row.next_attempt_at).toBeNull();
});

test('a payload hash conflict is retained for review, never replaced by current content', async () => {
  previousSubmission(); row.submission_payload_hash = 'conflicting-hash';
  await processCampaignQueue(); expect(submit).not.toHaveBeenCalled(); expect(row.outcome_reason).toBe('frozen_payload_mismatch');
});

test('failed consent lookup fails closed with a recoverable lease', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  mocks.users.findUnique.mockRejectedValueOnce(new Error('Fixture preference read failed'));
  await processCampaignQueue(); expect(submit).not.toHaveBeenCalled(); expect(row.status).toBe('SENDING'); expect(row.submission_payload).toBeNull();
  log.mockRestore();
});

test('provider acceptance followed by a failed write preserves a lease for identical replay', async () => {
  const normal = mocks.email_deliveries.updateMany.getMockImplementation()!;
  mocks.email_deliveries.updateMany.mockImplementation(async args => {
    if (args.data.status === 'SENT') throw new Error('Fixture database write lost');
    return normal(args);
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  await processCampaignQueue(); expect(row.status).toBe('SENDING'); expect(row.first_submission_at).toEqual(now);
  const firstPayload = submit.mock.calls[0]![0]; const firstKey = submit.mock.calls[0]![1];
  mocks.email_deliveries.updateMany.mockImplementation(normal);
  await processCampaignQueue(); expect(submit.mock.calls[1]).toEqual([firstPayload, firstKey]); expect(row.status).toBe('SENT');
  log.mockRestore();
});

test('stale completion cannot overwrite another lease or a terminal delivery', async () => {
  const old = { ...row }; row.lease_token = 'new-owner';
  await expect(recordCampaignSubmission(old, { status: 'accepted', id: 'late-provider-id' })).resolves.toEqual({ count: 0 });
  expect(row.resend_id).toBeNull();
});

test('uncertain is active, permanent failure is terminal, retryable rejection retains a due time', async () => {
  await recordCampaignSubmission({ ...row }, { status: 'uncertain', code: 'transport_error', canReplay: true });
  expect(row.status).toBe('UNCERTAIN'); expect(row.next_attempt_at).toEqual(new Date(now.getTime() + 60_000));
  row.status = 'SENDING'; row.lease_token = 'claim-2';
  await recordCampaignSubmission({ ...row }, { status: 'rejected', code: 'rate_limit_exceeded', retryable: true, retryAfterMs: 180_000 });
  expect(row.status).toBe('FAILED'); expect(row.retryable).toBe(true); expect(row.next_attempt_at).toEqual(new Date(now.getTime() + 86_400_000));
});

test('processing pause makes no queue, database or provider calls', async () => {
  delete process.env.EMAIL_CAMPAIGNS_ENABLED;
  await expect(processCampaignQueue()).resolves.toMatchObject({ paused: true, processed: 0 });
  expect(mocks.$queryRaw).not.toHaveBeenCalled(); expect(mocks.$transaction).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
});
