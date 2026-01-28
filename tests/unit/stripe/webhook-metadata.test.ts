/**
 * Unit tests for Stripe Webhook Metadata Parsing
 * @jest-environment node
 */

import { validateMembershipMetadata } from '@/lib/stripe/webhook/metadata';

describe('Stripe Webhook Metadata', () => {
  describe('validateMembershipMetadata', () => {
    it('should validate complete membership metadata', () => {
      const metadata = {
        user_id: 'user-123',
        user_email: 'test@example.com',
        user_name: 'Test User',
        purpose: 'membership',
      };

      const result = validateMembershipMetadata(metadata, 'membership');

      expect(result).toEqual({
        valid: true,
        data: {
          user_id: 'user-123',
          user_email: 'test@example.com',
          user_name: 'Test User',
          renewal_type: undefined,
          current_expiry: undefined,
        },
      });
    });

    it('should validate renewal metadata with renewal_type', () => {
      const metadata = {
        user_id: 'user-123',
        user_email: 'test@example.com',
        user_name: 'Test User',
        renewal_type: 'early',
        current_expiry: '2024-12-31',
        purpose: 'membership_renewal',
      };

      const result = validateMembershipMetadata(metadata, 'membership_renewal');

      expect(result).toEqual({
        valid: true,
        data: {
          user_id: 'user-123',
          user_email: 'test@example.com',
          user_name: 'Test User',
          renewal_type: 'early',
          current_expiry: '2024-12-31',
        },
      });
    });

    it('should fail when metadata is missing', () => {
      const result = validateMembershipMetadata(null, 'membership');

      expect(result).toEqual({
        valid: false,
        error: 'Missing metadata',
      });
    });

    it('should fail when user_id is missing', () => {
      const metadata = {
        user_email: 'test@example.com',
        purpose: 'membership',
      };

      const result = validateMembershipMetadata(metadata, 'membership');

      expect(result).toEqual({
        valid: false,
        error: 'Missing user_id in metadata',
      });
    });

    it('should fail when user_email is missing', () => {
      const metadata = {
        user_id: 'user-123',
        purpose: 'membership',
      };

      const result = validateMembershipMetadata(metadata, 'membership');

      expect(result).toEqual({
        valid: false,
        error: 'Missing user_email in metadata',
      });
    });

    it('should fail when renewal_type is missing for renewal', () => {
      const metadata = {
        user_id: 'user-123',
        user_email: 'test@example.com',
        purpose: 'membership_renewal',
      };

      const result = validateMembershipMetadata(metadata, 'membership_renewal');

      expect(result).toEqual({
        valid: false,
        error: 'Renewal payment missing renewal_type in metadata',
      });
    });
  });
});
