export interface RecoveryCandidate {
  role: string; user_status: string; deletion_status: string;
  deletion_requested_at: unknown; deletion_scheduled_for: unknown;
  membership_tier: string; expiry: string | Date | null; studio_status: string;
  is_profile_visible: boolean; admin_review: boolean; voiceover: boolean;
  has_refund: boolean; has_support_hold: boolean; has_paid: boolean; provider_linked: boolean;
  sent_legacy_offer: boolean; studio_created_at: string | Date; username: string;
  latitude: unknown; longitude: unknown; city: string;
}
/** Fail closed for ambiguous historical holds. This is an operational eligibility rule, not legal advice. */
export function recoveryExclusion(row: RecoveryCandidate, now = new Date()): string | null {
  if (row.role === 'ADMIN') return 'admin';
  if (row.user_status !== 'ACTIVE') return 'signup_incomplete';
  if (row.deletion_status !== 'ACTIVE' || row.deletion_requested_at || row.deletion_scheduled_for) return 'deletion';
  if (!row.is_profile_visible) return 'visibility_off';
  if (row.admin_review || row.has_support_hold) return 'review_hold';
  if (row.has_refund) return 'refund';
  if (row.voiceover) return 'voiceover_category';
  if (!['ACTIVE', 'INACTIVE'].includes(row.studio_status)) return 'publication_state';
  if (row.membership_tier !== 'PREMIUM') return 'not_premium';
  if (!row.expiry) return 'missing_expiry';
  if (new Date(row.expiry) > now) return 'unexpired';
  if (row.has_paid || row.provider_linked) return 'paid_membership_review';
  if (new Date(row.studio_created_at) >= new Date('2026-01-01') || !row.sent_legacy_offer) return 'missing_legacy_evidence';
  if (/^(temp_|expired_)/i.test(row.username) || !row.username.trim()) return 'username';
  if (row.latitude == null || row.longitude == null || !row.city.trim()) return 'location_review';
  return null;
}
