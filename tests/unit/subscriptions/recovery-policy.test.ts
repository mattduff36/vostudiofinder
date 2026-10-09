/** @jest-environment node */
import { applyPublicTierLimits, effectivePublicTier } from '@/lib/subscriptions/public-entitlements';
import { recoveryExclusion } from '@/lib/subscriptions/recovery-policy';
import { initialLegacyOfferState } from '@/lib/subscriptions/legacy-offer';
const now = new Date('2026-10-09');
it.each(['CANCELLED', 'SUSPENDED', 'UNPAID', 'INCOMPLETE', 'PAST_DUE'])('does not publish Premium benefits for %s subscriptions', status => {
  expect(effectivePublicTier({ membership_tier: 'PREMIUM', subscriptions: [{ current_period_end: new Date('2027-01-01'), status }] }, now)).toBe('BASIC');
});
it('legacy offer is unclaimed only without a prior recorded login', () => {
  expect(initialLegacyOfferState(null, new Date('2026-08-31'), now)).toBe('unclaimed');
  expect(initialLegacyOfferState(new Date('2026-01-01'), new Date('2026-08-31'), now)).toBe('review');
  expect(initialLegacyOfferState(new Date('2026-10-01'), new Date('2027-04-01'), now)).toBe('claimed');
});
it('expired stored Premium displays Basic benefits even before cron', () => {
  expect(effectivePublicTier({ membership_tier: 'PREMIUM', subscriptions: [{ current_period_end: new Date('2026-09-01'), status: 'ACTIVE' }] }, now)).toBe('BASIC');
});
it('Basic display limits preserve originals for renewal', () => {
  const stored = { studio_images: [1,2,3,4], studio_studio_types: [{ studio_type: 'VOICEOVER' }, { studio_type: 'HOME' }, { studio_type: 'RECORDING' }],
    phone: 'private', is_premium: true, is_verified: true, connection1:'1',connection2:'1',connection3:'1',connection4:'1',
    facebook_url:'a',x_url:'b',instagram_url:'c',custom_connection_methods:['custom'] };
  const visible = applyPublicTierLimits(stored, 'BASIC');
  expect(visible).toMatchObject({ phone: null, is_premium: false, is_verified: false, connection4:'0',instagram_url:null,custom_connection_methods:[] });
  expect(visible.studio_images).toHaveLength(2);
  expect(visible.studio_studio_types).toEqual([{ studio_type: 'HOME' }]);
  expect(stored.studio_images).toHaveLength(4);
  expect(stored.phone).toBe('private');
});
const eligible = { role:'USER',user_status:'ACTIVE',deletion_status:'ACTIVE',deletion_requested_at:null,deletion_scheduled_for:null,
  membership_tier:'PREMIUM',expiry:'2026-08-31',studio_status:'INACTIVE',is_profile_visible:true,admin_review:false,voiceover:false,
  has_refund:false,has_support_hold:false,has_paid:false,provider_linked:false,sent_legacy_offer:true,studio_created_at:'2025-09-01',
  username:'studio',latitude:50,longitude:1,city:'London' };
it('selects only evidenced expired legacy listings', () => expect(recoveryExclusion(eligible,now)).toBeNull());
it.each([
  ['visibility_off',{is_profile_visible:false}], ['deletion',{deletion_status:'PENDING_DELETION'}],
  ['review_hold',{admin_review:true}], ['refund',{has_refund:true}], ['voiceover_category',{voiceover:true}],
  ['missing_expiry',{expiry:null}], ['unexpired',{expiry:'2027-01-01'}], ['paid_membership_review',{has_paid:true}],
  ['missing_legacy_evidence',{sent_legacy_offer:false}], ['location_review',{latitude:null}],
])('excludes %s', (reason, change) => expect(recoveryExclusion({...eligible,...change},now)).toBe(reason));
