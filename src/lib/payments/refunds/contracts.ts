import { z } from 'zod';

export const refundRequestSchema = z.object({
  requestKey: z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  amount: z.number().int().positive().max(2_147_483_647),
  reason: z.enum(['requested_by_customer', 'duplicate', 'fraudulent']),
  comment: z.string().trim().max(2000).default(''),
  benefitAction: z.enum(['KEEP', 'END']).optional(),
  benefitGrantId: z.string().min(1).optional(),
  billingAction: z.enum(['KEEP', 'CANCEL_AT_PERIOD_END']).optional(),
  previewToken: z.string().min(1),
}).strict();

export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type MoneyStatus = 'PREPARED' | 'SUBMITTING' | 'UNKNOWN' | 'PENDING' | 'ACTION_REQUIRED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REVIEW';
export const HELD_MONEY_STATES: MoneyStatus[] = ['PREPARED', 'SUBMITTING', 'UNKNOWN', 'PENDING', 'ACTION_REQUIRED', 'REVIEW'];
export const REFUND_PAUSED_MESSAGE = 'New refunds are paused pending payment reconciliation approval. You can still inspect payments and existing refund outcomes.';
export const PROVIDER_REPLAY_WINDOW_MS = 23 * 60 * 60 * 1000;

export interface RefundEligibility {
  enabled: boolean;
  recoveryEnabled: boolean;
  reason: string | null;
  paymentId: string;
  currency: string;
  amount: number;
  settledAmount: number;
  heldAmount: number;
  availableAmount: number;
  packageLabel: string;
  previewToken: string;
  benefit: { id: string; kind: string; startsAt: string; endsAt: string; canEnd: boolean } | null;
  operations: RefundOperationSummary[];
  billing: { subscriptionId: string; state: 'KNOWN' | 'REVIEW'; cancelAtPeriodEnd: boolean; periodEnd: string | null; nextChargeAt: string | null; nextChargeAmount: number | null; currency: string | null } | null;
}

export interface RefundOperationSummary {
  id: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  moneyStatus: string;
  providerStatus: string | null;
  benefitStatus: string;
  billingStatus: string;
  notificationStatus: string;
  accessReviewRequired: boolean;
  errorCode: string | null;
}

export class RefundError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}

export function refundActivationEnabled() {
  return process.env.ADMIN_REFUNDS_ENABLED === 'true';
}

export function refundLifecycleEnabled() {
  return process.env.REFUND_LIFECYCLE_ENABLED === 'true';
}

export function providerMoneyState(status: string | null | undefined): MoneyStatus {
  switch (status) {
    case 'succeeded': return 'SUCCEEDED';
    case 'failed': return 'FAILED';
    case 'canceled': return 'CANCELLED';
    case 'pending': return 'PENDING';
    case 'requires_action': return 'ACTION_REQUIRED';
    default: return 'UNKNOWN';
  }
}

export function settlementProjection(status: MoneyStatus): 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PENDING' {
  if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED') return status;
  return 'PENDING';
}

export function settledPaymentStatus(amount: number, settled: number): 'SUCCEEDED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' {
  return settled === 0 ? 'SUCCEEDED' : settled >= amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
}

export function canReplayProviderRequest(submittedAt: Date | null, now = new Date()) {
  const age = submittedAt ? now.getTime() - submittedAt.getTime() : 0;
  return age >= 0 && age < PROVIDER_REPLAY_WINDOW_MS;
}

export function validateRefundChoices(request: RefundRequest, eligibility: RefundEligibility) {
  if (request.amount > eligibility.availableAmount) throw new RefundError('INSUFFICIENT_BALANCE', 'The available refundable balance changed. Review this payment again.');
  const full = eligibility.settledAmount + request.amount === eligibility.amount;
  if (!full) {
    if (request.benefitAction || request.benefitGrantId || request.billingAction) throw new RefundError('PARTIAL_ACCESS_CHANGE', 'Partial refunds do not change benefits or renewal settings.', 400);
    return false;
  }
  if (!request.benefitAction) throw new RefundError('BENEFIT_CHOICE_REQUIRED', 'Choose whether to keep or end the purchased benefit.', 400);
  if (request.benefitAction === 'END' && (!eligibility.benefit?.canEnd || request.benefitGrantId !== eligibility.benefit.id)) {
    throw new RefundError('BENEFIT_MAPPING_REQUIRED', 'This purchase cannot be safely ended automatically. Keep access or request a reviewed mapping.');
  }
  if (eligibility.billing) {
    if (eligibility.billing.state !== 'KNOWN') throw new RefundError('BILLING_REVIEW_REQUIRED', 'Renewal state is unknown. Reconcile the exact subscription before a full refund.');
    if (!request.billingAction) throw new RefundError('BILLING_CHOICE_REQUIRED', 'Choose whether to keep renewal or cancel it at the end of the confirmed period.', 400);
  } else if (request.billingAction) throw new RefundError('UNEXPECTED_BILLING_CHOICE', 'No attributable recurring subscription was found.', 400);
  return true;
}
