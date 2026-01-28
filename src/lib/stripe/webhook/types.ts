/**
 * Stripe Webhook Metadata Types
 */

export interface MembershipPaymentMetadata {
  user_id: string;
  user_email: string;
  user_name?: string;
  purpose: 'membership' | 'membership_renewal';
  renewal_type?: 'early' | 'standard' | '5year';
  current_expiry?: string;
}

export interface FeaturedUpgradeMetadata {
  user_id: string;
  user_email: string;
  studio_id: string;
  purpose: 'featured_upgrade';
}

export interface ParsedMembershipConfig {
  isRenewal: boolean;
  membershipMonths: number;
  couponCode: string | null;
}
