/**
 * Unit tests for Admin Studio Update Field Mapping
 * @jest-environment node
 */

import { buildUserUpdate, buildStudioUpdate, buildProfileUpdate, normalizeBoolean } from '@/lib/admin/studios/update/field-mapping';

describe('Admin Studio Update Field Mapping', () => {
  describe('normalizeBoolean', () => {
    it('should convert string "1" to true', () => {
      expect(normalizeBoolean('1')).toBe(true);
    });

    it('should convert boolean true to true', () => {
      expect(normalizeBoolean(true)).toBe(true);
    });

    it('should convert number 1 to true', () => {
      expect(normalizeBoolean(1)).toBe(true);
    });

    it('should convert string "0" to false', () => {
      expect(normalizeBoolean('0')).toBe(false);
    });

    it('should convert boolean false to false', () => {
      expect(normalizeBoolean(false)).toBe(false);
    });

    it('should convert number 0 to false', () => {
      expect(normalizeBoolean(0)).toBe(false);
    });

    it('should return undefined for undefined input', () => {
      expect(normalizeBoolean(undefined)).toBe(undefined);
    });
  });

  describe('buildUserUpdate', () => {
    it('should extract user fields from body', () => {
      const body = {
        display_name: 'John Doe',
        username: 'johndoe',
        avatar_image: 'https://example.com/avatar.jpg',
      };

      const result = buildUserUpdate(body);

      expect(result).toEqual({
        display_name: 'John Doe',
        username: 'johndoe',
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    it('should return empty object when no user fields present', () => {
      const body = {};
      const result = buildUserUpdate(body);
      expect(result).toEqual({});
    });

    it('should handle partial user updates', () => {
      const body = {
        display_name: 'Jane Smith',
      };

      const result = buildUserUpdate(body);

      expect(result).toEqual({
        display_name: 'Jane Smith',
      });
    });
  });

  describe('buildStudioUpdate', () => {
    it('should extract studio fields from _meta', () => {
      const body = {
        _meta: {
          studio_name: 'Test Studio',
          full_address: '123 Main St',
          city: 'London',
          phone: '+44 123456789',
          url: 'https://example.com',
          latitude: '51.5074',
          longitude: '-0.1278',
          show_exact_location: '1',
          verified: true,
          is_profile_visible: 1,
        },
        status: 'active',
      };

      const result = buildStudioUpdate(body);

      expect(result).toEqual({
        name: 'Test Studio',
        full_address: '123 Main St',
        city: 'London',
        phone: '+44 123456789',
        website_url: 'https://example.com',
        latitude: 51.5074,
        longitude: -0.1278,
        show_exact_location: true,
        is_verified: true,
        is_profile_visible: true,
        status: 'ACTIVE',
      });
    });

    it('should handle invalid coordinates gracefully', () => {
      const body = {
        _meta: {
          latitude: 'invalid',
          longitude: 'also invalid',
        },
      };

      const result = buildStudioUpdate(body);

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('buildProfileUpdate', () => {
    it('should extract profile fields from _meta', () => {
      const body = {
        _meta: {
          last_name: 'Doe',
          location: 'United Kingdom',
          about: 'Professional voice artist',
          short_about: 'Voice artist',
          facebook: 'https://facebook.com/test',
          x: 'https://x.com/test',
          linkedin: 'https://linkedin.com/in/test',
          instagram: 'https://instagram.com/test',
          rates1: '£50-100',
          showrates: '1',
          showemail: true,
          showphone: 1,
          connection1: 'Email',
          custom_connection_methods: ['Discord', 'Slack'],
          equipment_list: 'Neumann U87, Apollo Twin',
        },
      };

      const result = buildProfileUpdate(body);

      expect(result).toMatchObject({
        last_name: 'Doe',
        location: 'United Kingdom',
        about: 'Professional voice artist',
        short_about: 'Voice artist',
        facebook_url: 'https://facebook.com/test',
        x_url: 'https://x.com/test',
        twitter_url: 'https://x.com/test', // Should sync with x_url
        linkedin_url: 'https://linkedin.com/in/test',
        instagram_url: 'https://instagram.com/test',
        rate_tier_1: '£50-100',
        show_rates: true,
        show_email: true,
        show_phone: true,
        connection1: 'Email',
        custom_connection_methods: ['Discord', 'Slack'],
        equipment_list: 'Neumann U87, Apollo Twin',
      });
    });

    it('should filter empty custom connection methods', () => {
      const body = {
        _meta: {
          custom_connection_methods: ['Discord', '', 'Slack', '  '],
        },
      };

      const result = buildProfileUpdate(body);

      expect(result.custom_connection_methods).toEqual(['Discord', 'Slack']);
    });

    it('should limit custom connection methods to 2', () => {
      const body = {
        _meta: {
          custom_connection_methods: ['Discord', 'Slack', 'WhatsApp', 'Telegram'],
        },
      };

      const result = buildProfileUpdate(body);

      expect(result.custom_connection_methods).toHaveLength(2);
      expect(result.custom_connection_methods).toEqual(['Discord', 'Slack']);
    });

    it('should clear featured_until when unfeaturing', () => {
      const body = {
        _meta: {
          featured: '0',
        },
      };

      const result = buildProfileUpdate(body);

      expect(result.is_featured).toBe(false);
      expect(result.featured_until).toBeNull();
    });
  });
});
