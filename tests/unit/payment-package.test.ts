/**
 * Unit tests for admin payment package labels
 * @jest-environment node
 */

import {
  describePaymentPackage,
  getPaymentPackageLabel,
  getPaymentPackageBadgeClass,
} from '@/lib/payment-package';

describe('payment package labels', () => {
  it('labels annual premium membership', () => {
    expect(
      describePaymentPackage({
        purpose: 'membership',
        auto_renew: 'false',
      })
    ).toEqual({
      label: 'Premium (annual)',
      known: true,
      tone: 'premium',
    });
  });

  it('labels subscription membership from auto_renew or subscription_id', () => {
    expect(getPaymentPackageLabel({ purpose: 'membership', auto_renew: 'true' })).toBe(
      'Premium (subscription)'
    );
    expect(
      getPaymentPackageLabel({
        purpose: 'membership',
        subscription_id: 'sub_123',
      })
    ).toBe('Premium (subscription)');
  });

  it('labels upgrades, renewals, featured, and switch-to-subscription', () => {
    expect(getPaymentPackageLabel({ purpose: 'membership_upgrade', auto_renew: 'false' })).toBe(
      'Premium upgrade'
    );
    expect(getPaymentPackageLabel({ purpose: 'membership_upgrade', auto_renew: 'true' })).toBe(
      'Premium upgrade (subscription)'
    );
    expect(getPaymentPackageLabel({ purpose: 'membership_renewal', renewal_type: 'standard' })).toBe(
      'Premium renewal'
    );
    expect(getPaymentPackageLabel({ purpose: 'membership_renewal', renewal_type: 'early' })).toBe(
      'Premium early renewal'
    );
    expect(getPaymentPackageLabel({ purpose: 'membership_renewal', renewal_type: '5year' })).toBe(
      'Premium 5-year'
    );
    expect(describePaymentPackage({ purpose: 'featured_upgrade' })).toEqual({
      label: 'Featured studio (6 months)',
      known: true,
      tone: 'featured',
    });
    expect(getPaymentPackageLabel({ purpose: 'switch_to_subscription' })).toBe(
      'Premium (switch to subscription)'
    );
  });

  it('falls back for legacy plan metadata, unknown purposes, and missing metadata', () => {
    expect(getPaymentPackageLabel({ plan: 'PREMIUM_YEARLY' })).toBe('Premium (subscription)');
    expect(getPaymentPackageLabel({ subscription_id: 'sub_abc' })).toBe('Premium (subscription)');
    expect(getPaymentPackageLabel({ purpose: 'membership' })).toBe('Premium (annual)');
    expect(describePaymentPackage({ purpose: 'custom_offer' })).toEqual({
      label: 'Custom Offer',
      known: false,
      tone: 'unknown',
    });
    expect(describePaymentPackage(null)).toEqual({
      label: 'Unknown',
      known: false,
      tone: 'unknown',
    });
    expect(describePaymentPackage(undefined)).toEqual({
      label: 'Unknown',
      known: false,
      tone: 'unknown',
    });
    expect(describePaymentPackage([])).toEqual({
      label: 'Unknown',
      known: false,
      tone: 'unknown',
    });
    expect(describePaymentPackage({})).toEqual({
      label: 'Unknown',
      known: false,
      tone: 'unknown',
    });
  });

  it('maps badge tones', () => {
    expect(getPaymentPackageBadgeClass('premium')).toContain('slate');
    expect(getPaymentPackageBadgeClass('featured')).toContain('amber');
    expect(getPaymentPackageBadgeClass('unknown')).toContain('gray');
  });
});
