import { Prisma, type email_campaigns } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audienceSelectionSchema, parseStoredAudience } from './recipients';
import { resolveCampaignAudience, emailOperationHash } from './recipient-service';
import { loadResolvedTemplate, templateStorageData, freezeTemplateSender, EmailAdminError } from './template-store';

export const EMAIL_QUEUE_VERSION = 2;
/** Expansion requires an explicit operational rollout; transactional email is independent. */
export const campaignProcessingEnabled = (): boolean => process.env.EMAIL_CAMPAIGNS_ENABLED === 'true';
export function requireCampaignProcessing(): void {
  if (!campaignProcessingEnabled()) throw new EmailAdminError('Campaign sending is paused. Drafts and audience review remain available.', 503);
}

export const createCampaignSchema = z.object({
  requestKey: z.uuid(), name: z.string().trim().min(1).max(200), templateKey: z.string().min(1).max(100),
  audience: audienceSelectionSchema,
  scheduledAt: z.iso.datetime().optional(),
  autoRetry: z.boolean().default(false), maxRetries: z.number().int().min(1).max(50).default(3),
}).strict();
export const startCampaignSchema = z.object({
  audienceFingerprint: z.string().regex(/^[a-f0-9]{64}$/), templateRevision: z.number().int().nonnegative(),
}).strict();
export const retryCampaignSchema = z.object({ autoRetry: z.boolean().default(false), maxRetries: z.number().int().min(1).max(50).default(3) }).strict();

export function campaignForAdmin(campaign: email_campaigns) {
  const { template_snapshot: _snapshot, creation_payload_hash: _payloadHash, creation_request_key: _key, ...summary } = campaign;
  return { ...summary, processingEnabled: campaignProcessingEnabled(), requiresLegacyReview: !!campaign.started_at && campaign.queue_version !== EMAIL_QUEUE_VERSION };
}

export async function createCampaign(input: z.infer<typeof createCampaignSchema>, actorId: string) {
  const hash = emailOperationHash({ ...input, actorId });
  const existing = await db.email_campaigns.findUnique({ where: { creation_request_key: input.requestKey } });
  if (existing) {
    if (existing.creation_payload_hash !== hash) throw new EmailAdminError('This request key already belongs to a different campaign draft. Recover that campaign before beginning a new one.', 409);
    return existing;
  }
  try {
    return await db.$transaction(async tx => {
      const template = await loadResolvedTemplate(input.templateKey, tx);
      const review = await resolveCampaignAudience(input.audience, template, tx);
      if (!review.eligibleCount) throw new EmailAdminError('No eligible recipients match this audience');
      const record = await tx.email_templates.findUnique({ where: { key: template.key } });
      // Registry seeding is not a content edit: retain revision 0 so review stays valid.
      if (!record) await tx.email_templates.create({ data: { ...templateStorageData(template), created_by_id: actorId, updated_by_id: actorId } });
      return tx.email_campaigns.create({ data: {
        name: input.name, template_key: input.templateKey,
        filters: JSON.parse(JSON.stringify(input.audience)) as Prisma.InputJsonValue,
        recipient_count: review.eligibleCount, status: 'DRAFT',
        scheduled_at: input.scheduledAt ? new Date(input.scheduledAt) : null,
        auto_retry: input.autoRetry, max_retries: input.maxRetries, created_by_id: actorId,
        creation_request_key: input.requestKey, creation_payload_hash: hash,
      } });
    }, { isolationLevel: 'Serializable', timeout: 15_000 });
  } catch (error) {
    // A concurrent identical request may have won the unique creation key.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await db.email_campaigns.findUnique({ where: { creation_request_key: input.requestKey } });
      if (winner?.creation_payload_hash === hash) return winner;
    }
    throw error;
  }
}

export async function startCampaign(id: string, input: z.infer<typeof startCampaignSchema>) {
  requireCampaignProcessing();
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM email_campaigns WHERE id = ${id} FOR UPDATE`;
    const campaign = await tx.email_campaigns.findUnique({ where: { id } });
    if (!campaign) throw new EmailAdminError('Campaign not found', 404);
    if (campaign.status === 'CANCELLED') throw new EmailAdminError('A cancelled campaign cannot be restarted', 409);
    if (campaign.started_at) {
      if (campaign.queue_version === EMAIL_QUEUE_VERSION && campaign.audience_fingerprint === input.audienceFingerprint && campaign.template_revision === input.templateRevision) return campaign;
      throw new EmailAdminError('This campaign has already started. Reload its delivery state.', 409);
    }
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) throw new EmailAdminError('Campaign cannot start in its current state', 409);
    if (await tx.email_deliveries.count({ where: { campaign_id: id } })) throw new EmailAdminError('Existing deliveries require review before this historical campaign can start.', 409);
    const template = await loadResolvedTemplate(campaign.template_key, tx);
    const review = await resolveCampaignAudience(parseStoredAudience(campaign.filters), template, tx);
    if (review.audienceFingerprint !== input.audienceFingerprint || template.revision !== input.templateRevision) throw new EmailAdminError('The audience or template changed. Review the current recipients before starting.', 409);
    if (!review.eligibleCount) throw new EmailAdminError('No eligible recipients remain');
    await tx.email_deliveries.createMany({ data: review.recipients.map(user => ({
      campaign_id: id, user_id: user.id, reviewed_user_id: user.id, to_email: user.email,
      normalized_recipient: user.email, status: 'PENDING', next_attempt_at: campaign.scheduled_at ?? new Date(),
    })) });
    return tx.email_campaigns.update({ where: { id }, data: {
      status: campaign.scheduled_at && campaign.scheduled_at > new Date() ? 'SCHEDULED' : 'SENDING', started_at: new Date(), recipient_count: review.eligibleCount,
      audience_fingerprint: review.audienceFingerprint, template_revision: template.revision,
      template_snapshot: JSON.parse(JSON.stringify(freezeTemplateSender(template))) as Prisma.InputJsonValue,
      queue_version: EMAIL_QUEUE_VERSION,
    } });
  }, { isolationLevel: 'Serializable', timeout: 20_000 });
}

export async function cancelCampaign(id: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM email_campaigns WHERE id = ${id} FOR UPDATE`;
    const campaign = await tx.email_campaigns.findUnique({ where: { id } });
    if (!campaign) throw new EmailAdminError('Campaign not found', 404);
    if (campaign.status === 'CANCELLED') return campaign;
    if (campaign.status === 'SENT') throw new EmailAdminError('This campaign has already finished', 409);
    await tx.email_deliveries.updateMany({ where: { campaign_id: id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'SKIPPED', outcome_reason: 'campaign_cancelled', retryable: false, next_attempt_at: null } });
    return tx.email_campaigns.update({ where: { id }, data: {
      status: 'CANCELLED', completed_at: new Date(), auto_retry: false, retry_after: null,
    } });
  });
}

export async function retryCampaign(id: string, input: z.infer<typeof retryCampaignSchema>) {
  requireCampaignProcessing();
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM email_campaigns WHERE id = ${id} FOR UPDATE`;
    const campaign = await tx.email_campaigns.findUnique({ where: { id } });
    if (!campaign) throw new EmailAdminError('Campaign not found', 404);
    if (campaign.queue_version !== EMAIL_QUEUE_VERSION || !campaign.template_snapshot) throw new EmailAdminError('This historical campaign needs snapshot and delivery review before retry.', 409);
    if (campaign.status === 'CANCELLED') throw new EmailAdminError('Retry cannot reactivate a cancelled campaign', 409);
    if (campaign.status === 'SENDING') throw new EmailAdminError('This campaign is already active; reload its state.', 409);
    const reset = await tx.email_deliveries.updateMany({ where: {
      campaign_id: id, status: 'FAILED', retryable: true, resend_id: null,
      attempt_count: { lt: input.maxRetries + 1 },
      OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: new Date() } }],
    }, data: { status: 'PENDING', next_attempt_at: new Date() } });
    if (!reset.count) throw new EmailAdminError('No retryable failures are due within the attempt limit. Skipped, uncertain and permanent failures are not resent.', 409);
    await tx.email_campaigns.update({ where: { id }, data: { status: 'SENDING', completed_at: null,
      auto_retry: input.autoRetry, max_retries: input.maxRetries, retry_after: null } });
    return { retriedCount: reset.count, autoRetry: input.autoRetry, maxRetries: input.maxRetries };
  });
}
