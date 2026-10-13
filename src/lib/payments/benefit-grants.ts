import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';

export interface BenefitGrantInput {
  sourceKey: string;
  paymentId: string | null;
  userId: string;
  kind: 'PREMIUM' | 'FEATURED';
  subscriptionId?: string | null;
  studioId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
  startsAt: Date;
  endsAt: Date;
  mappingSource?: 'PURCHASE' | 'OBSERVED_BASELINE';
  requiresReview?: boolean;
}

/** Called in the same transaction as the awarded benefit. Never guess historic purchases. */
export async function recordBenefitGrant(tx: Prisma.TransactionClient, input: BenefitGrantInput) {
  if (!Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.endsAt.getTime()) || input.endsAt <= input.startsAt) {
    throw new Error('Invalid purchased benefit interval');
  }
  return tx.payment_benefit_grants.upsert({
    where: { source_key: input.sourceKey },
    update: {},
    create: {
      id: randomUUID(), source_key: input.sourceKey, payment_id: input.paymentId,
      user_reference: input.userId, kind: input.kind,
      subscription_id: input.subscriptionId ?? null, studio_id: input.studioId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      stripe_invoice_id: input.stripeInvoiceId ?? null,
      starts_at: input.startsAt, ends_at: input.endsAt,
      mapping_source: input.mappingSource ?? 'PURCHASE',
      evidence: { requires_review: input.requiresReview ?? false },
    },
  });
}

export interface BenefitInterval { starts_at: Date; ends_at: Date; status: string }

/** Contiguous coverage from now. A future isolated grant cannot bridge an unpaid gap. */
export function coveredUntil(grants: BenefitInterval[], now: Date): Date | null {
  const active = grants.filter(g => g.status === 'ACTIVE' && g.ends_at > now)
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  let end = now.getTime();
  for (const grant of active) {
    if (grant.starts_at.getTime() > end) break;
    end = Math.max(end, grant.ends_at.getTime());
  }
  return end > now.getTime() ? new Date(end) : null;
}

export function maximumGrantEnd(grants: BenefitInterval[]): Date | null {
  const ends = grants.filter(g => g.status === 'ACTIVE').map(g => g.ends_at.getTime());
  return ends.length ? new Date(Math.max(...ends)) : null;
}
