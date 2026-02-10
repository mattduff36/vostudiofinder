/**
 * Unit tests for VOICEOVER Studio Type Exclusivity Logic
 * @jest-environment node
 *
 * Tests the business rule: VOICEOVER is mutually exclusive with all other studio types.
 * - Basic members cannot select VOICEOVER at all
 * - Premium members can select VOICEOVER, but it cannot coexist with other types
 */

import { TIER_LIMITS, getTierLimits } from '@/lib/membership-tiers';

/**
 * Simulates the server-side studio type enforcement logic
 * from src/app/api/user/profile/route.ts
 */
function enforceStudioTypeRules(
  submittedTypes: string[],
  tier: 'BASIC' | 'PREMIUM'
): string[] {
  const tierLimits = getTierLimits(tier);

  // Step 1: Filter out excluded types for this tier
  let allowedTypes = submittedTypes.filter(
    (type) => !tierLimits.studioTypesExcluded.includes(type)
  );

  // Step 2: Enforce VOICEOVER exclusivity
  if (allowedTypes.includes('VOICEOVER') && allowedTypes.length > 1) {
    allowedTypes = ['VOICEOVER'];
  }

  // Step 3: Enforce max studio types for this tier
  if (tierLimits.studioTypesMax !== null) {
    allowedTypes = allowedTypes.slice(0, tierLimits.studioTypesMax);
  }

  return allowedTypes;
}

describe('VOICEOVER Exclusivity - Server-Side Enforcement', () => {
  describe('BASIC tier', () => {
    it('should reject VOICEOVER for BASIC members', () => {
      const result = enforceStudioTypeRules(['VOICEOVER'], 'BASIC');
      expect(result).toEqual([]);
    });

    it('should reject VOICEOVER even when mixed with other types', () => {
      const result = enforceStudioTypeRules(['HOME', 'VOICEOVER'], 'BASIC');
      // VOICEOVER is excluded, then max 1 type is enforced
      expect(result).toEqual(['HOME']);
      expect(result).not.toContain('VOICEOVER');
    });

    it('should allow a single non-VOICEOVER type for BASIC', () => {
      const result = enforceStudioTypeRules(['HOME'], 'BASIC');
      expect(result).toEqual(['HOME']);
    });

    it('should enforce max 1 studio type for BASIC', () => {
      const result = enforceStudioTypeRules(['HOME', 'RECORDING'], 'BASIC');
      expect(result).toHaveLength(1);
    });
  });

  describe('PREMIUM tier', () => {
    it('should allow VOICEOVER alone for PREMIUM members', () => {
      const result = enforceStudioTypeRules(['VOICEOVER'], 'PREMIUM');
      expect(result).toEqual(['VOICEOVER']);
    });

    it('should keep only VOICEOVER when submitted with other types', () => {
      const result = enforceStudioTypeRules(['HOME', 'VOICEOVER', 'RECORDING'], 'PREMIUM');
      expect(result).toEqual(['VOICEOVER']);
    });

    it('should keep only VOICEOVER when submitted with all other types', () => {
      const result = enforceStudioTypeRules(
        ['HOME', 'RECORDING', 'PODCAST', 'VOICEOVER', 'VO_COACH', 'AUDIO_PRODUCER'],
        'PREMIUM'
      );
      expect(result).toEqual(['VOICEOVER']);
    });

    it('should allow multiple non-VOICEOVER types for PREMIUM', () => {
      const result = enforceStudioTypeRules(['HOME', 'RECORDING', 'PODCAST'], 'PREMIUM');
      expect(result).toEqual(['HOME', 'RECORDING', 'PODCAST']);
    });

    it('should allow all non-VOICEOVER types for PREMIUM', () => {
      const result = enforceStudioTypeRules(
        ['HOME', 'RECORDING', 'PODCAST', 'VO_COACH', 'AUDIO_PRODUCER'],
        'PREMIUM'
      );
      expect(result).toHaveLength(5);
      expect(result).not.toContain('VOICEOVER');
    });

    it('should handle empty array', () => {
      const result = enforceStudioTypeRules([], 'PREMIUM');
      expect(result).toEqual([]);
    });
  });
});

describe('VOICEOVER Exclusivity - Tier Configuration', () => {
  it('BASIC tier should explicitly exclude VOICEOVER', () => {
    expect(TIER_LIMITS.BASIC.studioTypesExcluded).toContain('VOICEOVER');
  });

  it('PREMIUM tier should NOT exclude VOICEOVER', () => {
    expect(TIER_LIMITS.PREMIUM.studioTypesExcluded).not.toContain('VOICEOVER');
  });

  it('BASIC tier should limit to 1 studio type', () => {
    expect(TIER_LIMITS.BASIC.studioTypesMax).toBe(1);
  });

  it('PREMIUM tier should allow unlimited studio types', () => {
    expect(TIER_LIMITS.PREMIUM.studioTypesMax).toBeNull();
  });

  it('VOICEOVER should be the only excluded type for BASIC', () => {
    expect(TIER_LIMITS.BASIC.studioTypesExcluded).toEqual(['VOICEOVER']);
  });

  it('PREMIUM should have no excluded types', () => {
    expect(TIER_LIMITS.PREMIUM.studioTypesExcluded).toHaveLength(0);
  });
});

describe('VOICEOVER Exclusivity - Edge Cases', () => {
  it('should handle duplicate VOICEOVER entries', () => {
    const result = enforceStudioTypeRules(['VOICEOVER', 'VOICEOVER'], 'PREMIUM');
    expect(result).toEqual(['VOICEOVER']);
  });

  it('should handle VOICEOVER as the only type after exclusion filtering', () => {
    // If someone submits only VOICEOVER as BASIC, it gets excluded
    const basicResult = enforceStudioTypeRules(['VOICEOVER'], 'BASIC');
    expect(basicResult).toEqual([]);

    // Same type works for PREMIUM
    const premiumResult = enforceStudioTypeRules(['VOICEOVER'], 'PREMIUM');
    expect(premiumResult).toEqual(['VOICEOVER']);
  });

  it('should not modify non-VOICEOVER types for PREMIUM', () => {
    const types = ['HOME', 'RECORDING'];
    const result = enforceStudioTypeRules(types, 'PREMIUM');
    expect(result).toEqual(['HOME', 'RECORDING']);
  });

  it('should handle unknown studio types gracefully', () => {
    const result = enforceStudioTypeRules(['UNKNOWN_TYPE'], 'PREMIUM');
    expect(result).toEqual(['UNKNOWN_TYPE']);
  });
});
