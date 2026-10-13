/** @jest-environment node */
/**
 * Destructive only to uniquely named fixtures in the approved disposable target.
 * The provider is always mocked. This suite must never use a development/live DB.
 */
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
jest.mock('@/lib/db', () => {
  const { requireTestDatabase } = require('../../helpers/require-test-database');
  const url = requireTestDatabase(); const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55432' || target.pathname !== '/vsf_admin_fixture_utf8' || target.searchParams.get('schema') !== 'public') {
    throw new Error('Email SQL suite is restricted to the approved loopback:55432/vsf_admin_fixture_utf8 fixture database.');
  }
  const { PrismaClient } = require('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: url, log: [{ emit: 'event', level: 'query' }] }) };
});
jest.mock('@/lib/email/campaign-provider', () => ({ ...jest.requireActual('@/lib/email/campaign-provider'), submitFrozenEmail: jest.fn() }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { createCampaign, startCampaign, cancelCampaign, retryCampaign, createCampaignSchema } from '@/lib/email/campaigns';
import { claimCampaignDeliveries, processCampaignQueue, recordCampaignSubmission } from '@/lib/email/campaign-worker';
import { submitFrozenEmail, IDEMPOTENCY_RECOVERY_WINDOW_MS } from '@/lib/email/campaign-provider';
import { buildRecipientWhere, type AudienceSelection } from '@/lib/email/recipients';
import { resolveCampaignAudience, emailOperationHash } from '@/lib/email/recipient-service';
import { resolvedEmailTemplateSchema } from '@/lib/email/template-contract';
import { loadResolvedTemplate, templateStorageData } from '@/lib/email/template-store';
import { PATCH as patchTemplate } from '@/app/api/admin/emails/templates/[key]/route';

const prefix = `email-sql-${randomUUID()}`;
const actorId = `${prefix}-admin`;
const key = `${prefix}-template`;
const submit = jest.mocked(submitFrozenEmail);
const baseline = resolvedEmailTemplateSchema.parse({ key, name: 'Isolated email SQL fixture', subject: 'Reviewed subject', heading: 'Hello', bodyParagraphs: ['Hello {{displayName}}'], layout: 'STANDARD', isMarketing: true, isSystem: false, revision: 1, fromEmail: 'sender@example.invalid', variableSchema: { displayName: 'string' } });
let templateId: string;
let created = false;
let queryCount = 0;
jest.setTimeout(120_000);
const originalFlag = process.env.EMAIL_CAMPAIGNS_ENABLED;
const selected = (ids: string[]): AudienceSelection => ({ mode: 'selected', userIds: ids });

async function customer(suffix: string, extra: Partial<Prisma.usersUncheckedCreateInput> = {}) {
  const id = `${prefix}-${suffix}`;
  return db.users.create({ data: { id, email: `${suffix}.${prefix}@example.invalid`, username: `${prefix}-${suffix}`, display_name: `${prefix} ${suffix}`, updated_at: new Date(), status: 'ACTIVE', ...extra } });
}
async function draft(ids: string[]) {
  return createCampaign(createCampaignSchema.parse({ requestKey: randomUUID(), name: `${prefix} campaign`, templateKey: key, audience: selected(ids) }), actorId);
}
async function start(ids: string[]) {
  const campaign = await draft(ids);
  const review = await resolveCampaignAudience(selected(ids), await loadResolvedTemplate(key));
  const started = await startCampaign(campaign.id, { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision });
  return { campaign: started, review };
}
async function delivery(campaignId: string) {
  return db.email_deliveries.findFirstOrThrow({ where: { campaign_id: campaignId } });
}
async function deleteFixtures() {
  await db.email_campaigns.deleteMany({ where: { created_by_id: actorId } });
  await db.users.deleteMany({ where: { id: { startsWith: prefix, not: actorId } } });
}

beforeAll(async () => {
  (db as unknown as { $on: (event: 'query', callback: () => void) => void }).$on('query', () => { queryCount++; });
  // No pre-existing queue work may be processed by this suite's global cron entrypoint.
  if (await db.email_campaigns.count()) throw new Error('Email SQL suite requires an empty campaign queue in its disposable database.');
  await db.users.create({ data: { id: actorId, email: `${actorId}@example.invalid`, username: actorId, display_name: 'Email test admin', updated_at: new Date(), role: 'ADMIN' } });
  created = true;
  templateId = (await db.email_templates.create({ data: { ...templateStorageData(baseline), created_by_id: actorId } })).id;
  jest.mocked(getServerSession).mockResolvedValue({ user: { id: actorId, role: 'ADMIN' }, expires: '2099-01-01' } as never);
});
beforeEach(async () => {
  process.env.EMAIL_CAMPAIGNS_ENABLED = 'true'; submit.mockReset();
  submit.mockImplementation(async (_payload, submissionKey) => ({ status: 'accepted', id: `mock-provider-${submissionKey}` }));
  await deleteFixtures();
  await db.email_template_versions.deleteMany({ where: { template_id: templateId } });
  await db.email_templates.update({ where: { id: templateId }, data: templateStorageData(baseline) });
});
afterAll(async () => {
  jest.restoreAllMocks();
  try {
    if (created) { await deleteFixtures(); await db.email_templates.deleteMany({ where: { key } }); await db.users.deleteMany({ where: { id: actorId } }); }
  } finally {
    await db.$disconnect();
    if (originalFlag === undefined) delete process.env.EMAIL_CAMPAIGNS_ENABLED; else process.env.EMAIL_CAMPAIGNS_ENABLED = originalFlag;
  }
});

test('browse/review/create/start agree on verified studios, UTC dates, consent and explicit exclusions', async () => {
  const first = await customer('verified', { created_at: new Date('2026-10-13T23:59:59.999Z') });
  const out = await customer('opted-out', { created_at: new Date('2026-10-13T12:00:00Z') });
  const unverified = await customer('unverified', { created_at: new Date('2026-10-13T12:00:00Z') });
  const nextDay = await customer('next-day', { created_at: new Date('2026-10-14T00:00:00Z') });
  for (const user of [first, out, unverified, nextDay]) await db.studio_profiles.create({ data: { id: `${user.id}-studio`, user_id: user.id, name: 'Fixture', is_verified: user.id !== unverified.id, custom_connection_methods: [], updated_at: new Date() } });
  await db.email_preferences.create({ data: { user_id: out.id, marketing_opt_in: false } });
  const audience: AudienceSelection = { mode: 'filters', filters: { search: prefix, hasStudio: true, studioVerified: true, createdAfter: '2026-10-13', createdBefore: '2026-10-13' } };
  const browse = await db.users.findMany({ where: buildRecipientWhere(audience, true), select: { id: true } });
  const review = await resolveCampaignAudience(audience, baseline);
  expect(browse.map(user => user.id)).toEqual([first.id]); expect(review.recipients.map(user => user.id)).toEqual([first.id]); expect(review.exclusions.consent).toBe(1);
  const createdCampaign = await createCampaign(createCampaignSchema.parse({ requestKey: randomUUID(), name: `${prefix} parity`, templateKey: key, audience }), actorId);
  expect(createdCampaign.recipient_count).toBe(1);
  await startCampaign(createdCampaign.id, { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision });
  expect((await delivery(createdCampaign.id)).reviewed_user_id).toBe(first.id);
  const excluded = await resolveCampaignAudience({ mode: 'selected', userIds: [first.id, out.id], excludedEmails: [first.email] }, baseline);
  expect(excluded.eligibleCount).toBe(0); expect(submit).not.toHaveBeenCalled();
});

test('a stable creation key recovers one campaign and rejects a different payload', async () => {
  const user = await customer('create');
  const input = createCampaignSchema.parse({ requestKey: randomUUID(), name: `${prefix} stable`, templateKey: key, audience: selected([user.id]) });
  const one = await createCampaign(input, actorId); const recovered = await createCampaign(input, actorId);
  expect(recovered.id).toBe(one.id);
  await expect(createCampaign({ ...input, name: 'Changed payload' }, actorId)).rejects.toMatchObject({ status: 409 });
  expect(await db.email_campaigns.count({ where: { creation_request_key: input.requestKey } })).toBe(1);
});

test('concurrent starts create one delivery per normalized destination and preserve a repeatable start', async () => {
  const user = await customer('duplicate'); await customer('duplicate-case', { email: user.email.toUpperCase() });
  const users = await db.users.findMany({ where: { id: { startsWith: prefix, not: actorId } }, select: { id: true } });
  const ids = users.map(row => row.id); const campaign = await draft(ids);
  const review = await resolveCampaignAudience(selected(ids), baseline); const input = { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision };
  const attempts = await Promise.allSettled([startCampaign(campaign.id, input), startCampaign(campaign.id, input)]);
  expect(attempts.some(result => result.status === 'fulfilled')).toBe(true);
  // Serializable conflicts are actionable reloads; an identical replay returns the winner.
  expect((await startCampaign(campaign.id, input)).id).toBe(campaign.id);
  expect(await db.email_deliveries.count({ where: { campaign_id: campaign.id } })).toBe(1);
  expect((await delivery(campaign.id)).normalized_recipient).toBe(user.email.toLowerCase());
});

test('same-count identity/address or template changes invalidate the reviewed start', async () => {
  const user = await customer('review'); const campaign = await draft([user.id]);
  const review = await resolveCampaignAudience(selected([user.id]), baseline);
  await db.users.update({ where: { id: user.id }, data: { email: `changed.${prefix}@example.invalid` } });
  await expect(startCampaign(campaign.id, { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision })).rejects.toMatchObject({ status: 409 });
  const fresh = await resolveCampaignAudience(selected([user.id]), baseline);
  await db.email_templates.update({ where: { key }, data: { revision: 2, subject: 'Newer copy' } });
  await expect(startCampaign(campaign.id, { audienceFingerprint: fresh.audienceFingerprint, templateRevision: fresh.templateRevision })).rejects.toMatchObject({ status: 409 });
  expect(await db.email_deliveries.count({ where: { campaign_id: campaign.id } })).toBe(0);
  expect((await db.email_campaigns.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('DRAFT');
});

test('delivery materialization and start state roll back together after an injected write failure', async () => {
  const user = await customer('rollback'); const campaign = await draft([user.id]);
  const review = await resolveCampaignAudience(selected([user.id]), baseline);
  const original = db.$transaction.bind(db);
  const spy = jest.spyOn(db, '$transaction').mockImplementation((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options?: object) => {
    return original(async tx => {
      const wrapped = new Proxy(tx, { get(target, property) {
        if (property !== 'email_deliveries') return Reflect.get(target, property);
        return new Proxy(target.email_deliveries, { get(delegate, method) {
          if (method !== 'createMany') return Reflect.get(delegate, method);
          return async (args: Prisma.email_deliveriesCreateManyArgs) => { await delegate.createMany(args); throw new Error('Injected after materialization'); };
        } });
      } });
      return callback(wrapped);
    }, options);
  }) as never);
  try { await expect(startCampaign(campaign.id, { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision })).rejects.toThrow('Injected after materialization'); }
  finally { spy.mockRestore(); }
  expect(await db.email_deliveries.count({ where: { campaign_id: campaign.id } })).toBe(0);
  expect((await db.email_campaigns.findUniqueOrThrow({ where: { id: campaign.id } })).started_at).toBeNull();
});

test('two atomic claimers take disjoint batches; stale completion cannot overwrite the current lease', async () => {
  const a = await customer('claim-a'); const b = await customer('claim-b'); await start([a.id, b.id]);
  const claims = await Promise.all([claimCampaignDeliveries(new Date(), 1), claimCampaignDeliveries(new Date(), 1)]);
  expect(claims[0]).toHaveLength(1); expect(claims[1]).toHaveLength(1); expect(claims[0][0]!.id).not.toBe(claims[1][0]!.id);
  const stale = claims[0][0]!;
  await db.email_deliveries.update({ where: { id: stale.id }, data: { lease_token: 'new-owner' } });
  expect(await recordCampaignSubmission(stale, { status: 'accepted', id: 'late-id' })).toEqual({ count: 0 });
  expect((await db.email_deliveries.findUniqueOrThrow({ where: { id: stale.id } })).resend_id).toBeNull();
});

test.each(['deleted', 'address', 'consent'] as const)('%s after review skips the captured recipient at first submission', async change => {
  const user = await customer(`changed-${change}`); const { campaign } = await start([user.id]);
  if (change === 'deleted') await db.users.delete({ where: { id: user.id } });
  if (change === 'address') await db.users.update({ where: { id: user.id }, data: { email: `changed.${prefix}@example.invalid` } });
  if (change === 'consent') await db.email_preferences.create({ data: { user_id: user.id, marketing_opt_in: false } });
  await processCampaignQueue(); const result = await delivery(campaign.id);
  expect(result.status).toBe('SKIPPED'); expect(result.reviewed_user_id).toBe(user.id); expect(submit).not.toHaveBeenCalled();
  if (change === 'deleted') expect(result.user_id).toBeNull();
});

test('cancellation before and after claim does not send unsubmitted work or allow ordinary Retry', async () => {
  const user = await customer('cancel'); const { campaign } = await start([user.id]);
  const claims = await claimCampaignDeliveries(); expect(claims).toHaveLength(1);
  await cancelCampaign(campaign.id);
  await db.email_deliveries.update({ where: { id: claims[0]!.id }, data: { lease_expires_at: new Date(Date.now() - 1) } });
  await processCampaignQueue(); expect((await delivery(campaign.id)).status).toBe('SKIPPED'); expect(submit).not.toHaveBeenCalled();
  await expect(retryCampaign(campaign.id, { autoRetry: false, maxRetries: 3 })).rejects.toMatchObject({ status: 409 });
});

test('lost provider response replays a frozen payload/key and later positive acceptance finishes the delivery', async () => {
  const user = await customer('uncertain'); const { campaign } = await start([user.id]);
  submit.mockResolvedValueOnce({ status: 'uncertain', code: 'transport_error', canReplay: true });
  await processCampaignQueue(); const first = await delivery(campaign.id);
  expect(first.status).toBe('UNCERTAIN'); expect(first.resend_id).toBeNull();
  expect((await db.email_campaigns.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('SENDING');
  await db.users.delete({ where: { id: user.id } }); await cancelCampaign(campaign.id);
  await db.email_templates.update({ where: { key }, data: { revision: 2, subject: 'Changed later' } });
  await db.email_deliveries.update({ where: { id: first.id }, data: { next_attempt_at: new Date(Date.now() - 1) } });
  await processCampaignQueue(); const recovered = await delivery(campaign.id);
  expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]); expect(recovered.status).toBe('SENT'); expect(recovered.resend_id).toBeTruthy();
  expect(recovered.submission_payload_hash).toBe(first.submission_payload_hash);
  expect((await db.email_campaigns.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('CANCELLED');
});

test('expired in-flight lease recovers captured acceptance within the window and stops after expiry', async () => {
  const user = await customer('lease'); const { campaign } = await start([user.id]); const row = await delivery(campaign.id);
  const payload = { from: 'sender@example.invalid', to: user.email, subject: 'Frozen before crash', html: '<p>Frozen copy</p>', text: 'Frozen copy' };
  await db.email_deliveries.update({ where: { id: row.id }, data: {
    status: 'SENDING', lease_token: 'crashed-worker', lease_expires_at: new Date(Date.now() - 1), attempt_count: 1,
    first_submission_at: new Date(Date.now() - 60_000), submission_key: `campaign/${row.id}/1`, submission_payload: payload, submission_payload_hash: emailOperationHash(payload),
  } });
  await processCampaignQueue(); expect(submit).toHaveBeenCalledWith(payload, `campaign/${row.id}/1`);
  // A separate uncertain fixture outside retention must not rotate a key or send again.
  const later = await customer('expired'); const other = await start([later.id]); const expired = await delivery(other.campaign.id);
  const expiredPayload = { ...payload, to: later.email };
  await db.email_deliveries.update({ where: { id: expired.id }, data: { status: 'UNCERTAIN', attempt_count: 1,
    first_submission_at: new Date(Date.now() - IDEMPOTENCY_RECOVERY_WINDOW_MS - 1), next_attempt_at: new Date(Date.now() - 1),
    submission_key: `campaign/${expired.id}/1`, submission_payload: expiredPayload, submission_payload_hash: emailOperationHash(expiredPayload),
  } });
  submit.mockClear(); await processCampaignQueue(); expect(submit).not.toHaveBeenCalled();
  expect(await delivery(other.campaign.id)).toMatchObject({ status: 'UNCERTAIN', next_attempt_at: null, outcome_reason: 'provider_outcome_requires_review' });
});

test('template revision and version creation are atomic and stale concurrent updates conflict', async () => {
  const request = (subject: string) => new NextRequest('http://localhost/api/admin/emails/templates/fixture', { method: 'PATCH', body: JSON.stringify({ revision: 1, subject }) });
  const context = { params: Promise.resolve({ key }) };
  const responses = await Promise.all([patchTemplate(request('Admin A copy'), context), patchTemplate(request('Admin B copy'), context)]);
  expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
  const record = await db.email_templates.findUniqueOrThrow({ where: { key } }); expect(record.revision).toBe(2);
  expect(await db.email_template_versions.count({ where: { template_id: templateId } })).toBe(1);
  const version = await db.email_template_versions.findFirstOrThrow({ where: { template_id: templateId } });
  expect(version.snapshot).toMatchObject({ subject: record.subject, revision: 2, variableSchema: baseline.variableSchema, isMarketing: true });
});

test('a version insertion failure rolls the preceding template copy update back', async () => {
  // Deliberately reserve the next version number only inside this disposable fixture.
  await db.email_template_versions.create({ data: { template_id: templateId, version_number: 2, subject: 'Existing revision evidence', heading: 'Existing', body_paragraphs: ['Existing'], bullet_items: [] } });
  const response = await patchTemplate(new NextRequest('http://localhost/api/admin/emails/templates/fixture', { method: 'PATCH', body: JSON.stringify({ revision: 1, subject: 'Must roll back' }) }), { params: Promise.resolve({ key }) });
  expect(response.status).toBe(409);
  const record = await db.email_templates.findUniqueOrThrow({ where: { key } }); expect(record.subject).toBe(baseline.subject); expect(record.revision).toBe(1);
});

test('the 10,000-user bound rejects overflow and materializes its supported maximum atomically', async () => {
  const fixtureUsers = Array.from({ length: 10_001 }, (_, index) => ({
    id: `${prefix}-capacity-${index}`, username: `${prefix}-capacity-${index}`, email: `${index}.capacity.${prefix}@example.invalid`,
    display_name: 'Capacity fixture', updated_at: new Date(), status: 'ACTIVE' as const,
  }));
  await db.users.createMany({ data: fixtureUsers });
  await expect(resolveCampaignAudience({ mode: 'filters', filters: { search: `${prefix}-capacity-` } }, baseline)).rejects.toMatchObject({ status: 413 });
  const ids = fixtureUsers.slice(0, 10_000).map(user => user.id);
  const input = createCampaignSchema.parse({ requestKey: randomUUID(), name: `${prefix} capacity`, templateKey: key, audience: selected(ids) });
  queryCount = 0;
  const reviewStarted = performance.now(); const review = await resolveCampaignAudience(input.audience, baseline); const reviewMs = performance.now() - reviewStarted; const reviewQueries = queryCount;
  queryCount = 0;
  const createStarted = performance.now(); const campaign = await createCampaign(input, actorId); const createMs = performance.now() - createStarted; const createQueries = queryCount;
  queryCount = 0;
  const startStarted = performance.now(); await startCampaign(campaign.id, { audienceFingerprint: review.audienceFingerprint, templateRevision: review.templateRevision }); const startMs = performance.now() - startStarted; const startQueries = queryCount;
  expect(await db.email_deliveries.count({ where: { campaign_id: campaign.id } })).toBe(10_000);
  expect((await db.email_campaigns.findUniqueOrThrow({ where: { id: campaign.id } })).status).toBe('SENDING'); expect(submit).not.toHaveBeenCalled();
  console.info('Email fixture capacity', JSON.stringify({ recipients: 10_000, requestBytes: Buffer.byteLength(JSON.stringify(input)), reviewMs: Math.round(reviewMs), reviewQueries, createMs: Math.round(createMs), createQueries, startMs: Math.round(startMs), startQueries }));
}, 120_000);
