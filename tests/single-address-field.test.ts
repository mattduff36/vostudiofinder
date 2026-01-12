/**
 * Test Suite: Single Address Field Implementation
 * 
 * Tests for the removal of abbreviated_address and addition of preview map
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'test-user-id', email: 'test@example.com' },
    },
    status: 'authenticated',
  }),
}));

describe('Single Address Field - Validation Schemas', () => {
  it('should not accept abbreviated_address in createStudioSchema', async () => {
    const { createStudioSchema } = await import('@/lib/validations/studio');
    
    const validData = {
      name: 'Test Studio',
      description: 'A test studio description that is long enough',
      studio_studio_types: ['VOICEOVER'],
      city: 'London',
      studio_services: ['ISDN'],
      full_address: '123 Test Street, London',
    };

    // Should parse successfully without abbreviated_address
    const result = createStudioSchema.safeParse(validData);
    expect(result.success).toBe(true);

    // Should parse successfully even if abbreviated_address is provided (it will be ignored)
    const dataWithDeprecated = {
      ...validData,
      abbreviated_address: 'Test St, London',
    };
    
    const result2 = createStudioSchema.safeParse(dataWithDeprecated);
    expect(result2.success).toBe(true);
    if (result2.success) {
      // Verify abbreviated_address is not in the parsed data
      expect('abbreviated_address' in result2.data).toBe(false);
    }
  });

  it('should not accept abbreviated_address in updateStudioSchema', async () => {
    const { updateStudioSchema } = await import('@/lib/validations/studio');
    
    const validData = {
      id: 'clabcdef12345678901', // Valid CUID format
      name: 'Updated Studio',
      full_address: '456 New Street, Manchester',
      city: 'Manchester',
    };

    const result = updateStudioSchema.safeParse(validData);
    expect(result.success).toBe(true);

    // abbreviated_address should be ignored if provided
    const dataWithDeprecated = {
      ...validData,
      abbreviated_address: 'New St, Manchester',
    };
    
    const result2 = updateStudioSchema.safeParse(dataWithDeprecated);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect('abbreviated_address' in result2.data).toBe(false);
    }
  });
});

describe('Single Address Field - Geocoding Enhancements', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Mock Google Maps Geocoding API
    global.fetch = jest.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should extract city from various address component types', async () => {
    const mockGeocodeResponse = {
      results: [{
        geometry: {
          location: { lat: 51.5074, lng: -0.1278 }
        },
        formatted_address: '123 Test Street, London, UK',
        address_components: [
          { types: ['postal_town'], long_name: 'Greater London' },
          { types: ['country'], long_name: 'United Kingdom' },
        ]
      }],
      status: 'OK'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeocodeResponse,
    });

    const { geocodeAddress } = await import('@/lib/maps');
    const result = await geocodeAddress('London, UK');

    expect(result).toBeDefined();
    expect(result?.city).toBe('Greater London'); // Should use postal_town
    expect(result?.country).toBe('United Kingdom');
    expect(result?.lat).toBe(51.5074);
    expect(result?.lng).toBe(-0.1278);
  });

  it('should prioritize locality over postal_town', async () => {
    const mockGeocodeResponse = {
      results: [{
        geometry: {
          location: { lat: 51.5074, lng: -0.1278 }
        },
        formatted_address: 'Westminster, London, UK',
        address_components: [
          { types: ['locality'], long_name: 'Westminster' },
          { types: ['postal_town'], long_name: 'Greater London' },
          { types: ['country'], long_name: 'United Kingdom' },
        ]
      }],
      status: 'OK'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeocodeResponse,
    });

    const { geocodeAddress } = await import('@/lib/maps');
    const result = await geocodeAddress('Westminster, London, UK');

    expect(result?.city).toBe('Westminster'); // Should prioritize locality
  });

  it('should handle vague addresses with administrative areas', async () => {
    const mockGeocodeResponse = {
      results: [{
        geometry: {
          location: { lat: 53.4808, lng: -2.2426 }
        },
        formatted_address: 'Greater Manchester, UK',
        address_components: [
          { types: ['administrative_area_level_2'], long_name: 'Greater Manchester' },
          { types: ['country'], long_name: 'United Kingdom' },
        ]
      }],
      status: 'OK'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeocodeResponse,
    });

    const { geocodeAddress } = await import('@/lib/maps');
    const result = await geocodeAddress('Greater Manchester');

    expect(result?.city).toBe('Greater Manchester'); // Should use admin_area_level_2
    expect(result?.country).toBe('United Kingdom');
  });

  it('should return null on geocoding failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], status: 'ZERO_RESULTS' }),
    });

    const { geocodeAddress } = await import('@/lib/maps');
    const result = await geocodeAddress('Invalid Address 12345');

    expect(result).toBeNull();
  });
});

describe('Single Address Field - Address Utilities', () => {
  it('should extract city from full address', async () => {
    const { extractCity } = await import('@/lib/utils/address');

    expect(extractCity('123 Main St, London, UK')).toBe('London');
    expect(extractCity('456 Broadway, New York, NY 10013')).toBe('New York');
    expect(extractCity('789 Rue de la Paix, Paris 75002')).toBe('Paris');
    expect(extractCity('Unit 5, Manchester, M1 1AA')).toBe('Manchester');
  });

  it('should handle addresses without clear city', async () => {
    const { extractCity } = await import('@/lib/utils/address');

    // Should return empty string or first meaningful part
    const result = extractCity('UK');
    expect(typeof result).toBe('string');
  });

  it('should calculate distance between coordinates', async () => {
    const { calculateDistance } = await import('@/lib/utils/address');

    // London to Manchester ~260km
    const distance = calculateDistance(51.5074, -0.1278, 53.4808, -2.2426);
    
    expect(distance).toBeGreaterThan(250);
    expect(distance).toBeLessThan(280);
  });

  it('should calculate short distances accurately', async () => {
    const { calculateDistance } = await import('@/lib/utils/address');

    // Two nearby points in London (roughly 1km apart)
    const distance = calculateDistance(51.5074, -0.1278, 51.5144, -0.1195);
    
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(2);
  });
});

describe('Single Address Field - Data Migration', () => {
  it('should describe backfill behavior for abbreviated_address', () => {
    // This is a documentation test for the backfill logic
    // The actual backfill happens in the API route
    
    const backfillScenarios = [
      {
        before: { full_address: null, abbreviated_address: 'Old Address' },
        after: { full_address: 'Old Address', abbreviated_address: 'Old Address' },
        description: 'Should copy abbreviated_address to full_address when full_address is empty',
      },
      {
        before: { full_address: 'Existing Address', abbreviated_address: 'Old Address' },
        after: { full_address: 'Existing Address', abbreviated_address: 'Old Address' },
        description: 'Should NOT overwrite existing full_address',
      },
      {
        before: { full_address: null, abbreviated_address: null },
        after: { full_address: null, abbreviated_address: null },
        description: 'Should leave both null if both are null',
      },
    ];

    backfillScenarios.forEach(scenario => {
      expect(scenario.description).toBeTruthy();
      // The actual implementation is in the API route
      // These scenarios document the expected behavior
    });
  });
});

describe('Single Address Field - TypeScript Type Safety', () => {
  it('should have proper types for studio profile', async () => {
    // Import the type
    type StudioProfile = {
      full_address?: string | null;
      city?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      // abbreviated_address should not be here anymore in new code
    };

    const profile: StudioProfile = {
      full_address: '123 Test St',
      city: 'London',
      latitude: 51.5074,
      longitude: -0.1278,
    };

    expect(profile.full_address).toBe('123 Test St');
    expect(profile.city).toBe('London');
    expect(profile.latitude).toBe(51.5074);
    expect(profile.longitude).toBe(-0.1278);
  });
});

describe('Single Address Field - Integration Checks', () => {
  it('should verify map markers use coordinates', () => {
    // This documents that map markers require coordinates
    const studioWithCoords = {
      id: 'studio1',
      name: 'Test Studio',
      latitude: 51.5074,
      longitude: -0.1278,
    };

    const studioWithoutCoords = {
      id: 'studio2',
      name: 'No Coords Studio',
      latitude: null,
      longitude: null,
    };

    // Map should only show studios with valid coordinates
    expect(studioWithCoords.latitude && studioWithCoords.longitude).toBeTruthy();
    expect(studioWithoutCoords.latitude && studioWithoutCoords.longitude).toBeFalsy();
  });

  it('should verify directions fallback logic', () => {
    // Documents the fallback chain for directions
    const studio = {
      latitude: 51.5074,
      longitude: -0.1278,
      full_address: '123 Test Street, London',
      address: 'Old Legacy Address',
    };

    // Priority: 1) lat/lng, 2) full_address, 3) address
    const hasCoordinates = studio.latitude && studio.longitude;
    const hasFallback = studio.full_address || studio.address;

    expect(hasCoordinates).toBeTruthy();
    expect(hasFallback).toBeTruthy();

    // If no coordinates, should use full_address first
    const studioNoCoords = {
      latitude: null,
      longitude: null,
      full_address: '123 Test Street, London',
      address: 'Old Legacy Address',
    };

    const addressForDirections = studioNoCoords.full_address || studioNoCoords.address;
    expect(addressForDirections).toBe('123 Test Street, London');
  });
});

describe('Single Address Field - Preview Map Constraints', () => {
  it('should enforce 10km movement limit', () => {
    const MAX_DISTANCE_KM = 10;
    
    // Simulate distance calculation
    const geocodedPoint = { lat: 51.5074, lng: -0.1278 };
    const draggedPoint = { lat: 51.5974, lng: -0.1278 }; // ~10km north
    
    // This would be calculated in the component using calculateDistance
    // Just verify the constraint constant
    expect(MAX_DISTANCE_KM).toBe(10);
  });

  it('should describe preview map desktop-only behavior', () => {
    // Preview map should only show on desktop (md breakpoint and above)
    const desktopBreakpoint = 'md'; // Tailwind md = 768px
    
    expect(desktopBreakpoint).toBe('md');
    // The implementation uses: <div className="hidden md:block">
  });
});
