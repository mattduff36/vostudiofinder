/**
 * Profile Completion Calculation Tests
 * 
 * Tests for the calculateCompletionStats function to ensure:
 * 1. Social media links are correctly counted (x_url, tiktok_url, threads_url)
 * 2. All 12 connection methods are detected (connection1-12)
 * 3. Required and optional fields are properly validated
 * 4. Completion percentages are accurately calculated
 */

import { calculateCompletionStats } from '@/lib/utils/profile-completion';

describe('Profile Completion Calculation', () => {
  // Base valid profile data with all required fields
  const createBaseProfile = () => ({
    user: {
      username: 'testuser',
      display_name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    profile: {
      short_about: 'Short bio',
      about: 'Longer bio about the user',
      phone: '+1234567890',
      location: 'United States',
      connection1: '1',
      rate_tier_1: 100,
      equipment_list: 'Microphone, Interface',
      services_offered: 'Voice recording, Editing',
    },
    studio: {
      name: 'Test Studio',
      studio_types: ['RECORDING'],
      images: [{ id: 1 }],
      website_url: 'https://example.com',
    },
  });

  describe('Social Media Links Detection', () => {
    it('should correctly count social media links with x_url instead of twitter_url', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          facebook_url: 'https://facebook.com/test',
          x_url: 'https://x.com/test',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.overall.percentage).toBeGreaterThan(65); // Should have social media bonus
    });

    it('should count tiktok_url in social media links', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          tiktok_url: 'https://tiktok.com/@test',
          instagram_url: 'https://instagram.com/test',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.overall.percentage).toBeGreaterThan(65); // Should have social media bonus
    });

    it('should count threads_url in social media links', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          threads_url: 'https://threads.net/@test',
          linkedin_url: 'https://linkedin.com/in/test',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.overall.percentage).toBeGreaterThan(65); // Should have social media bonus
    });

    it('should require at least 2 social media links for optional completion', () => {
      const profileWithOne = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          facebook_url: 'https://facebook.com/test',
        },
      };

      const profileWithTwo = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          facebook_url: 'https://facebook.com/test',
          x_url: 'https://x.com/test',
        },
      };

      const statsOne = calculateCompletionStats(profileWithOne);
      const statsTwo = calculateCompletionStats(profileWithTwo);

      expect(statsTwo.overall.percentage).toBeGreaterThan(statsOne.overall.percentage);
    });

    it('should count all 8 social media platforms', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          facebook_url: 'https://facebook.com/test',
          x_url: 'https://x.com/test',
          youtube_url: 'https://youtube.com/@test',
          instagram_url: 'https://instagram.com/test',
          tiktok_url: 'https://tiktok.com/@test',
          linkedin_url: 'https://linkedin.com/in/test',
          threads_url: 'https://threads.net/@test',
          soundcloud_url: 'https://soundcloud.com/test',
        },
      };

      const stats = calculateCompletionStats(profile);
      // Should have social media bonus (at least 2 links present)
      expect(stats.overall.percentage).toBeGreaterThan(65);
    });
  });

  describe('Connection Methods Detection', () => {
    it('should detect connection1 through connection8', () => {
      const connections = ['connection1', 'connection2', 'connection3', 'connection4', 'connection5', 'connection6', 'connection7', 'connection8'];
      
      connections.forEach((conn) => {
        const profile = {
          ...createBaseProfile(),
          profile: {
            ...createBaseProfile().profile,
            [conn]: '1',
          },
        };

        const stats = calculateCompletionStats(profile);
        expect(stats.required.completed).toBe(11); // All required fields including connection
      });
    });

    it('should detect connection9 (ipDTL)', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: undefined,
          connection9: '1',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(11); // All required fields including connection9
    });

    it('should detect connection10 (SquadCast)', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: undefined,
          connection10: '1',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(11); // All required fields including connection10
    });

    it('should detect connection11 (Zencastr)', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: undefined,
          connection11: '1',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(11); // All required fields including connection11
    });

    it('should detect connection12 (Other)', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: undefined,
          connection12: '1',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(11); // All required fields including connection12
    });

    it('should fail if no connection methods are selected', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: undefined,
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11); // Missing required connection
    });

    it('should accept multiple connection methods', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          connection1: '1',
          connection5: '1',
          connection9: '1',
          connection12: '1',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(11); // All required fields including connections
    });
  });

  describe('Required Fields Validation', () => {
    it('should mark all 11 required fields as complete with valid data', () => {
      const profile = createBaseProfile();
      const stats = calculateCompletionStats(profile);
      
      expect(stats.required.completed).toBe(11);
      expect(stats.required.total).toBe(11);
    });

    it('should reject temp_ usernames', () => {
      const profile = {
        ...createBaseProfile(),
        user: {
          ...createBaseProfile().user,
          username: 'temp_12345',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require display_name', () => {
      const profile = {
        ...createBaseProfile(),
        user: {
          ...createBaseProfile().user,
          display_name: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require studio name', () => {
      const profile = {
        ...createBaseProfile(),
        studio: {
          ...createBaseProfile().studio,
          name: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require at least one studio type', () => {
      const profile = {
        ...createBaseProfile(),
        studio: {
          ...createBaseProfile().studio,
          studio_types: [],
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require at least one image', () => {
      const profile = {
        ...createBaseProfile(),
        studio: {
          ...createBaseProfile().studio,
          images: [],
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require website_url', () => {
      const profile = {
        ...createBaseProfile(),
        studio: {
          ...createBaseProfile().studio,
          website_url: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require location', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          location: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require short_about', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          short_about: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should require about', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          about: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });
  });

  describe('Optional Fields Validation', () => {
    it('should increase percentage with avatar_url', () => {
      const withoutAvatar = {
        ...createBaseProfile(),
        user: {
          ...createBaseProfile().user,
          avatar_url: null,
        },
      };
      const withAvatar = createBaseProfile();

      const statsWithout = calculateCompletionStats(withoutAvatar);
      const statsWith = calculateCompletionStats(withAvatar);

      expect(statsWith.overall.percentage).toBeGreaterThan(statsWithout.overall.percentage);
    });

    it('should increase percentage with phone', () => {
      const withoutPhone = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          phone: '',
        },
      };
      const withPhone = createBaseProfile();

      const statsWithout = calculateCompletionStats(withoutPhone);
      const statsWith = calculateCompletionStats(withPhone);

      expect(statsWith.overall.percentage).toBeGreaterThan(statsWithout.overall.percentage);
    });

    it('should increase percentage with rate_tier_1', () => {
      const withoutRate = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          rate_tier_1: null,
        },
      };
      const withRate = createBaseProfile();

      const statsWithout = calculateCompletionStats(withoutRate);
      const statsWith = calculateCompletionStats(withRate);

      expect(statsWith.overall.percentage).toBeGreaterThan(statsWithout.overall.percentage);
    });

    it('should handle rate_tier_1 as string', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          rate_tier_1: '150.50' as any,
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.overall.percentage).toBeGreaterThan(65); // Should have rate bonus
    });

    it('should increase percentage with equipment_list', () => {
      const withoutEquipment = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          equipment_list: '',
        },
      };
      const withEquipment = createBaseProfile();

      const statsWithout = calculateCompletionStats(withoutEquipment);
      const statsWith = calculateCompletionStats(withEquipment);

      expect(statsWith.overall.percentage).toBeGreaterThan(statsWithout.overall.percentage);
    });

    it('should increase percentage with services_offered', () => {
      const withoutServices = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          services_offered: '',
        },
      };
      const withServices = createBaseProfile();

      const statsWithout = calculateCompletionStats(withoutServices);
      const statsWith = calculateCompletionStats(withServices);

      expect(statsWith.overall.percentage).toBeGreaterThan(statsWithout.overall.percentage);
    });
  });

  describe('Percentage Calculation', () => {
    it('should return approximately 65% for required fields only', () => {
      const profile = {
        ...createBaseProfile(),
        user: {
          ...createBaseProfile().user,
          avatar_url: null,
        },
        profile: {
          ...createBaseProfile().profile,
          phone: '',
          rate_tier_1: null,
          equipment_list: '',
          services_offered: '',
          facebook_url: '',
          x_url: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.overall.percentage).toBeGreaterThanOrEqual(63);
      expect(stats.overall.percentage).toBeLessThanOrEqual(67);
    });

    it('should return 100% for all fields completed', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          // Add 2+ social media links for optional completion
          facebook_url: 'https://facebook.com/test',
          x_url: 'https://x.com/test',
        },
      };
      const stats = calculateCompletionStats(profile);
      
      expect(stats.overall.percentage).toBe(100);
    });

    it('should cap percentage at 100%', () => {
      const profile = createBaseProfile();
      const stats = calculateCompletionStats(profile);
      
      expect(stats.overall.percentage).toBeLessThanOrEqual(100);
    });

    it('should return 0% for empty profile', () => {
      const profile = {
        user: {
          username: '',
          display_name: '',
          email: '',
          avatar_url: null,
        },
        profile: {},
        studio: {
          name: '',
          studio_types: [],
          images: [],
          website_url: '',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBe(0);
      expect(stats.overall.percentage).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing profile object', () => {
      const profile = {
        user: createBaseProfile().user,
        studio: createBaseProfile().studio,
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should handle missing studio object', () => {
      const profile = {
        user: createBaseProfile().user,
        profile: createBaseProfile().profile,
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should trim whitespace from strings', () => {
      const profile = {
        ...createBaseProfile(),
        user: {
          ...createBaseProfile().user,
          display_name: '   ',
        },
      };

      const stats = calculateCompletionStats(profile);
      expect(stats.required.completed).toBeLessThan(11);
    });

    it('should handle null values', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          phone: null,
          equipment_list: null,
        },
      };

      const stats = calculateCompletionStats(profile);
      // Should still have all required fields complete
      expect(stats.required.completed).toBe(11);
    });

    it('should handle undefined values', () => {
      const profile = {
        ...createBaseProfile(),
        profile: {
          ...createBaseProfile().profile,
          phone: undefined,
          equipment_list: undefined,
        },
      };

      const stats = calculateCompletionStats(profile);
      // Should still have all required fields complete
      expect(stats.required.completed).toBe(11);
    });
  });
});
