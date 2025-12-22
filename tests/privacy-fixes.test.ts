/**
 * Privacy Fixes Test Suite
 * Tests that no full_address is exposed in public APIs
 */

import { describe, it, expect } from '@jest/globals';

// Polyfill fetch for Node.js environment
global.fetch = global.fetch || require('node-fetch');

describe('Privacy Fixes - Address Exposure', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  describe('Search Suggestions API', () => {
    it('should return abbreviated_address instead of full_address', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=london`);
      const data = await response.json();

      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach((suggestion: any) => {
          // Check that location suggestions don't contain full addresses
          if (suggestion.type === 'location') {
            expect(suggestion.text).toBeDefined();
            // Should not contain house numbers or detailed street info
            expect(suggestion.text).not.toMatch(/^\d+\s+\w+\s+(street|road|avenue|lane)/i);
          }
          
          // Check metadata doesn't expose full_address
          if (suggestion.metadata) {
            expect(suggestion.metadata.full_address).toBeUndefined();
          }
        });
      }

      expect(response.status).toBe(200);
    });

    it('should not expose full addresses in studio suggestions', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=studio`);
      const data = await response.json();

      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach((suggestion: any) => {
          if (suggestion.type === 'studio' && suggestion.metadata) {
            // Should have abbreviated_address, not full_address
            expect(suggestion.metadata.full_address).toBeUndefined();
            if (suggestion.metadata.abbreviated_address) {
              expect(suggestion.metadata.abbreviated_address).not.toMatch(/^\d+\s+\w+\s+street/i);
            }
          }
        });
      }

      expect(response.status).toBe(200);
    });
  });

  describe('User Search API', () => {
    it('should return location without full_location field', async () => {
      const response = await fetch(`${BASE_URL}/api/search/users?q=test`);
      const data = await response.json();

      if (data.users && data.users.length > 0) {
        data.users.forEach((user: any) => {
          // Should NOT have full_location field
          expect(user.full_location).toBeUndefined();
          
          // Should have abbreviated location
          if (user.location) {
            expect(user.location).toBeDefined();
            expect(typeof user.location).toBe('string');
          }
        });
      }

      expect(response.status).toBe(200);
    });
  });

  describe('Studios Search API', () => {
    it('should return abbreviated_address in studio listings', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?limit=10`);
      const data = await response.json();

      if (data.studios && data.studios.length > 0) {
        data.studios.forEach((studio: any) => {
          // Should have address field (mapped from abbreviated_address)
          if (studio.address) {
            expect(studio.address).toBeDefined();
            // Should not contain house numbers at the start
            expect(studio.address).not.toMatch(/^\d+\s+\w+\s+street/i);
          }
          
          // Should NOT have full_address field exposed
          expect(studio.full_address).toBeUndefined();
        });
      }

      expect(response.status).toBe(200);
    });

    it('should handle location searches with abbreviated addresses', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?location=London&radius=10`);
      const data = await response.json();

      if (data.studios && data.studios.length > 0) {
        data.studios.forEach((studio: any) => {
          expect(studio.full_address).toBeUndefined();
          if (studio.address) {
            expect(typeof studio.address).toBe('string');
          }
        });
      }

      expect(response.status).toBe(200);
    });
  });
});

