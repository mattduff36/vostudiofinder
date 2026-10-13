import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type email_deliveries } from '@prisma/client';
import { db } from '@/lib/db';
import { z } from 'zod';
import { EmailAdminError } from './template-store';
import { EMAIL_QUEUE_VERSION, campaignProcessingEnabled } from './campaigns';
import { isMarketingEligible, normalizeRecipientEmail } from './recipients';
import { emailOperationHash } from './recipient-service';
import { resolvedEmailTemplateSchema } from './template-contract';
import { renderResolvedEmailTemplate } from './render';
import { generateUnsubscribeToken } from './unsubscribe-token';
import { submitFrozenEmail, frozenEmailPayloadSchema, canReconcileSubmission, type FrozenEmailPayload, type EmailSubmissionResult } from './campaign-provider';

const LEASE_MS = 10 * 60_000;
const AUTOMATIC_RETRY_MS = 24 * 60 * 60_000;
const MAX_RECOVERY_ATTEMPTS = 6;

/** Atomic, bounded claims. SKIP LOCKED lets concurrent cron invocations coexist. */
export async function claimCampaignDeliveries(now = new Date(), limit = 10): Promise<email_deliveries[]> {
  if (!campaignProcessingEnabled()) return [];
  const lease = randomUUID();
  const expiry = new Date(now.getTime() + LEASE_MS);
  return db.$queryRaw<email_deliveries[]>`
    WITH candidates AS (
      SELECT d.id FROM email_deliveries d JOIN email_campaigns c ON c.id = d.campaign_id
      WHERE c.queue_version = ${EMAIL_QUEUE_VERSION} AND (
        (c.status = 'SENDING' AND (c.scheduled_at IS NULL OR c.scheduled_at <= ${now}) AND
          ((d.status = 'PENDING' AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= ${now})) OR
           (d.status = 'FAILED' AND d.retryable = true AND c.auto_retry = true AND d.attempt_count <= c.max_retries
             AND d.next_attempt_at IS NOT NULL AND d.next_attempt_at <= ${now})))
        OR (d.status = 'UNCERTAIN' AND d.next_attempt_at IS NOT NULL AND d.next_attempt_at <= ${now})
        OR (d.status = 'SENDING' AND d.lease_expires_at <= ${now})
      )
      ORDER BY d.created_at, d.id LIMIT ${Math.max(1, Math.min(limit, 50))}
      FOR UPDATE OF d SKIP LOCKED
    )
    UPDATE email_deliveries d SET status = 'SENDING', lease_token = ${lease}, lease_expires_at = ${expiry}
    FROM candidates WHERE d.id = candidates.id RETURNING d.*
  `;
}

interface PreparedSubmission { payload: FrozenEmailPayload; key: string; attempt: number }

async function prepareSubmission(claim: email_deliveries, now: Date): Promise<PreparedSubmission | null> {
  return db.$transaction(async tx => {
    // Cancellation uses the same campaign lock. Provider IO stays outside this transaction.
    await tx.$queryRaw`SELECT id FROM email_campaigns WHERE id = ${claim.campaign_id} FOR UPDATE`;
    const delivery = await tx.email_deliveries.findUnique({ where: { id: claim.id }, include: { campaign: true } });
    if (!delivery || delivery.lease_token !== claim.lease_token || delivery.status !== 'SENDING') return null;
    const campaign = delivery.campaign;
    if (!campaign || campaign.queue_version !== EMAIL_QUEUE_VERSION) return null;
    const owned = { id: delivery.id, lease_token: claim.lease_token, status: 'SENDING' as const };
    const skip = async (reason: string) => {
      await tx.email_deliveries.updateMany({ where: owned, data: {
        status: 'SKIPPED', outcome_reason: reason, retryable: false, next_attempt_at: null, lease_token: null, lease_expires_at: null,
      } });
      return null;
    };
    // An ambiguous attempt reconciles its captured destination/content even if the user
    // later changes. It must not manufacture a different delivery or rotate the key.
    const ambiguous = !!delivery.first_submission_at && !delivery.retryable;
    if (ambiguous && (!canReconcileSubmission(delivery.first_submission_at!, now) || delivery.attempt_count >= MAX_RECOVERY_ATTEMPTS)) {
      await tx.email_deliveries.updateMany({ where: owned, data: {
        status: 'UNCERTAIN', outcome_reason: 'provider_outcome_requires_review', next_attempt_at: null, lease_token: null, lease_expires_at: null,
      } });
      return null;
    }
    if (!ambiguous && campaign.status !== 'SENDING') return skip('campaign_cancelled');
    const template = resolvedEmailTemplateSchema.parse(campaign.template_snapshot);
    let payload: FrozenEmailPayload;
    if (delivery.submission_payload) {
      const parsed = frozenEmailPayloadSchema.parse(delivery.submission_payload);
      payload = { from: parsed.from, to: parsed.to, subject: parsed.subject, html: parsed.html,
        ...(parsed.text !== undefined ? { text: parsed.text } : {}), ...(parsed.replyTo ? { replyTo: parsed.replyTo } : {}) };
      if (emailOperationHash(payload) !== delivery.submission_payload_hash || payload.to !== delivery.normalized_recipient) {
        await tx.email_deliveries.updateMany({ where: owned, data: {
          status: 'UNCERTAIN', outcome_reason: 'frozen_payload_mismatch', next_attempt_at: null, lease_token: null, lease_expires_at: null,
        } });
        return null;
      }
    } else if (ambiguous) {
      await tx.email_deliveries.updateMany({ where: owned, data: {
        status: 'UNCERTAIN', outcome_reason: 'missing_frozen_payload', next_attempt_at: null, lease_token: null, lease_expires_at: null,
      } });
      return null;
    } else {
      // Assigned after the fresh identity and consent check below.
      payload = { from: '', to: '', subject: '', html: '' };
    }
    if (!ambiguous) {
      if (!delivery.reviewed_user_id || delivery.user_id !== delivery.reviewed_user_id) return skip('recipient_deleted');
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${delivery.reviewed_user_id} FOR UPDATE`;
      const user = await tx.users.findUnique({ where: { id: delivery.reviewed_user_id }, select: {
        id: true, email: true, display_name: true, username: true, deletion_status: true,
        studio_profiles: { select: { name: true } }, email_preferences: true,
      } });
      if (!user) return skip('recipient_deleted');
      if (user.deletion_status !== 'ACTIVE') return skip('recipient_deletion_hold');
      if (normalizeRecipientEmail(user.email) !== delivery.normalized_recipient) return skip('recipient_address_changed');
      if (template.isMarketing && !isMarketingEligible(user.email_preferences)) return skip('marketing_consent_withdrawn');
      if (!delivery.submission_payload) {
        const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://voiceoverstudiofinder.com';
        const variables: Record<string, string> = {
          displayName: user.display_name || 'there', username: user.username || '',
          studioName: user.studio_profiles?.name || user.display_name || 'Your Studio',
          profileUrl: user.username ? `${base}/${encodeURIComponent(user.username)}` : base,
          userEmail: delivery.to_email, email: delivery.to_email,
        };
        if (template.key === 'legacy-user-announcement') {
          // Preserve the existing 7-day legacy reset flow, atomically with its frozen email.
          const resetToken = randomBytes(32).toString('base64url');
          await tx.users.update({ where: { id: user.id }, data: { reset_token: resetToken,
            reset_token_expiry: new Date(now.getTime() + 7 * 86_400_000), updated_at: now } });
          variables.resetPasswordUrl = `${base}/auth/reset-password?token=${resetToken}`;
        }
        const unsubscribeUrl = template.isMarketing ? `${base}/email/unsubscribe?token=${await generateUnsubscribeToken(user.id, tx)}` : undefined;
        const rendered = renderResolvedEmailTemplate(template, variables, {
          includeUnsubscribe: template.isMarketing, ...(unsubscribeUrl ? { unsubscribeUrl } : {}),
        });
        payload = { to: delivery.to_email, from: template.fromName ? `${template.fromName} <${template.fromEmail}>` : template.fromEmail,
          subject: rendered.subject, html: rendered.html, text: rendered.text,
          ...(template.replyToEmail ? { replyTo: template.replyToEmail } : {}) };
        frozenEmailPayloadSchema.parse(payload);
      }
    }
    const key = delivery.submission_key ?? `campaign/${delivery.id}/1`;
    const updated = await tx.email_deliveries.updateMany({ where: owned, data: {
      submission_key: key, submission_payload: JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue,
      submission_payload_hash: emailOperationHash(payload), first_submission_at: delivery.first_submission_at ?? now,
      outcome_reason: 'submission_in_flight', retryable: false,
      attempt_count: { increment: 1 }, lease_expires_at: new Date(now.getTime() + LEASE_MS),
    } });
    if (!updated.count) return null;
    return { payload, key, attempt: delivery.attempt_count + 1 };
  }, { timeout: 15_000 });
}

/** Conditional completion prevents an expired worker overwriting a later owner. */
export async function recordCampaignSubmission(claim: email_deliveries, result: EmailSubmissionResult, now = new Date()) {
  const common = { lease_token: null, lease_expires_at: null };
  let data: Prisma.email_deliveriesUpdateManyMutationInput;
  if (result.status === 'accepted') data = { ...common, status: 'SENT', sent_at: now, resend_id: result.id,
    outcome_reason: 'provider_accepted', error_message: null, retryable: false, next_attempt_at: null };
  else if (result.status === 'rejected') data = { ...common, status: 'FAILED', failed_at: now,
    outcome_reason: result.code, error_message: result.code, retryable: result.retryable,
    next_attempt_at: result.retryable ? new Date(now.getTime() + Math.max(AUTOMATIC_RETRY_MS, result.retryAfterMs ?? 0)) : null };
  else data = { ...common, status: 'UNCERTAIN', outcome_reason: result.code, error_message: 'Provider acceptance is uncertain; no new delivery has been created.',
    retryable: false, next_attempt_at: result.canReplay ? new Date(now.getTime() + Math.max(60_000, result.retryAfterMs ?? 0)) : null };
  return db.email_deliveries.updateMany({ where: { id: claim.id, lease_token: claim.lease_token, status: 'SENDING', resend_id: null }, data });
}

export async function refreshCampaignProgress(id: string, now = new Date()) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM email_campaigns WHERE id = ${id} FOR UPDATE`;
    const campaign = await tx.email_campaigns.findUnique({ where: { id } });
    if (!campaign || campaign.queue_version !== EMAIL_QUEUE_VERSION) return;
    const stats = await tx.email_deliveries.groupBy({ by: ['status'], where: { campaign_id: id }, _count: true });
    const count = (status: string) => stats.find(row => row.status === status)?._count ?? 0;
    const retry = campaign.auto_retry ? await tx.email_deliveries.findFirst({ where: {
      campaign_id: id, status: 'FAILED', retryable: true, attempt_count: { lte: campaign.max_retries }, next_attempt_at: { not: null },
    }, orderBy: { next_attempt_at: 'asc' }, select: { next_attempt_at: true } }) : null;
    const active = count('PENDING') + count('SENDING') + count('UNCERTAIN') > 0 || !!retry;
    const terminal = !active && campaign.status === 'SENDING';
    await tx.email_campaigns.update({ where: { id }, data: {
      sent_count: count('SENT'), failed_count: count('FAILED') + count('BOUNCED'), retry_after: retry?.next_attempt_at ?? null,
      ...(terminal ? { status: 'SENT', completed_at: now, auto_retry: false } : {}),
    } });
  });
}

export async function processCampaignQueue() {
  if (!campaignProcessingEnabled()) return { paused: true, processed: 0, sent: 0, failed: 0, uncertain: 0 };
  await db.email_campaigns.updateMany({ where: { queue_version: EMAIL_QUEUE_VERSION, status: 'SCHEDULED', started_at: { not: null }, scheduled_at: { lte: new Date() } }, data: { status: 'SENDING' } });
  const claims = await claimCampaignDeliveries();
  const totals = { paused: false, processed: 0, sent: 0, failed: 0, uncertain: 0 };
  for (const claim of claims) {
    try {
      const prepared = await prepareSubmission(claim, new Date());
      if (!prepared) continue;
      const result = await submitFrozenEmail(prepared.payload, prepared.key);
      // If persistence fails here, retain the claim. Lease recovery replays the
      // identical payload/key; it must never record a false definitive failure.
      const persisted = await recordCampaignSubmission(claim, result);
      if (persisted.count) {
        totals.processed++;
        if (result.status === 'accepted') totals.sent++;
        else if (result.status === 'rejected') totals.failed++;
        else totals.uncertain++;
      }
    } catch (error) {
      if (error instanceof EmailAdminError || error instanceof z.ZodError) {
        await db.email_deliveries.updateMany({ where: { id: claim.id, lease_token: claim.lease_token, status: 'SENDING', first_submission_at: null }, data: {
          status: 'FAILED', failed_at: new Date(), outcome_reason: 'invalid_template_or_recipient_data',
          retryable: false, next_attempt_at: null, lease_token: null, lease_expires_at: null,
        } });
      } else console.error('Campaign delivery requires lease recovery');
    }
  }
  // Include runs with no remaining claims (e.g. their final accepted batch).
  const active = await db.email_campaigns.findMany({ where: { queue_version: EMAIL_QUEUE_VERSION, status: 'SENDING' }, select: { id: true }, take: 100, orderBy: { updated_at: 'asc' } });
  const ids = new Set([...claims.map(claim => claim.campaign_id).filter((id): id is string => !!id), ...active.map(campaign => campaign.id)]);
  for (const id of ids) await refreshCampaignProgress(id);
  return totals;
}
