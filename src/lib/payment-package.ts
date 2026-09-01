/**
 * Human-readable package labels for admin payment tracking.
 * Derived from Stripe checkout metadata already stored on payment records.
 */

export type PaymentPackageTone = 'premium' | 'featured' | 'unknown';

export interface PaymentPackageInfo {
  label: string;
  known: boolean;
  tone: PaymentPackageTone;
}

const UNKNOWN: PaymentPackageInfo = {
  label: 'Unknown',
  known: false,
  tone: 'unknown',
};

function asMetadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as Record<string, unknown>;
}

function readString(meta: Record<string, unknown>, key: string): string | undefined {
  const value = meta[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true';
}

function hasSubscriptionId(meta: Record<string, unknown>): boolean {
  return typeof meta.subscription_id === 'string' && meta.subscription_id.length > 0;
}

function humanizePurpose(purpose: string): string {
  return purpose
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function premium(label: string): PaymentPackageInfo {
  return { label, known: true, tone: 'premium' };
}

/**
 * Resolve a display label from payment metadata written at checkout/webhook time.
 */
export function describePaymentPackage(metadata: unknown): PaymentPackageInfo {
  const meta = asMetadataRecord(metadata);
  if (!meta) return UNKNOWN;

  const purpose = readString(meta, 'purpose');
  const renewalType = readString(meta, 'renewal_type');
  const plan = readString(meta, 'plan');
  const subscribed = hasSubscriptionId(meta) || isTruthyFlag(meta.auto_renew);

  switch (purpose) {
    case 'membership':
      return premium(subscribed ? 'Premium (subscription)' : 'Premium (annual)');
    case 'membership_upgrade':
      return premium(subscribed ? 'Premium upgrade (subscription)' : 'Premium upgrade');
    case 'membership_renewal':
      if (renewalType === '5year') return premium('Premium 5-year');
      if (renewalType === 'early') return premium('Premium early renewal');
      return premium('Premium renewal');
    case 'featured_upgrade':
      return { label: 'Featured studio (6 months)', known: true, tone: 'featured' };
    case 'switch_to_subscription':
      return premium('Premium (switch to subscription)');
    default:
      break;
  }

  if (hasSubscriptionId(meta) || plan === 'PREMIUM_YEARLY') {
    return premium('Premium (subscription)');
  }

  if (purpose) {
    return { label: humanizePurpose(purpose), known: false, tone: 'unknown' };
  }

  return UNKNOWN;
}

export function getPaymentPackageLabel(metadata: unknown): string {
  return describePaymentPackage(metadata).label;
}

export function getPaymentPackageBadgeClass(tone: PaymentPackageTone): string {
  if (tone === 'featured') return 'bg-amber-100 text-amber-800';
  if (tone === 'premium') return 'bg-slate-100 text-slate-800';
  return 'bg-gray-100 text-gray-500';
}
