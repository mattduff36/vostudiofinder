/**
 * Integration Tests for API Endpoints
 * Tests that all modified APIs work correctly
 */

import { describe, it, expect } from '@jest/globals';

// Polyfill fetch for Node.js environment
global.fetch = global.fetch || require('node-fetch');

describe('API Endpoints Integration', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000';

  describe('Search Suggestions Endpoint', () => {
    it('should handle empty query', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual([]);
    });

    it('should handle short query (< 2 chars)', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=a`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual([]);
    });

    it('should return suggestions for valid query', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=studio`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(Array.isArray(data.suggestions)).toBe(true);
    });

    it('should detect search type', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=london`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.searchType).toBeDefined();
    });

    it('should include metadata with coordinates', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=london`);
      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        const locationSuggestion = data.suggestions.find((s: any) => s.type === 'location');
        if (locationSuggestion && locationSuggestion.metadata) {
          if (locationSuggestion.metadata.coordinates) {
            expect(locationSuggestion.metadata.coordinates.lat).toBeDefined();
            expect(locationSuggestion.metadata.coordinates.lng).toBeDefined();
          }
        }
      }
      
      expect(response.status).toBe(200);
    });
  });

  describe('User Search Endpoint', () => {
    it('should handle empty query', async () => {
      const response = await fetch(`${BASE_URL}/api/search/users?q=`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it('should handle short query', async () => {
      const response = await fetch(`${BASE_URL}/api/search/users?q=a`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
    });

    it('should return user data structure', async () => {
      const response = await fetch(`${BASE_URL}/api/search/users?q=test`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data.users)).toBe(true);
      
      if (data.users.length > 0) {
        const user = data.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('display_name');
        expect(user).not.toHaveProperty('full_location'); // Privacy check
      }
    });
  });

  describe('Studios Search Endpoint', () => {
    it('should return studios with correct structure', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?limit=5`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('studios');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.studios)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?limit=10&offset=0`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('offset');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter by location', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?location=London`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.filters).toHaveProperty('location');
    });

    it('should filter by studio types', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?studioTypes=VOICEOVER,HOME`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      if (data.filters && data.filters.studioTypes) {
        expect(Array.isArray(data.filters.studioTypes)).toBe(true);
      }
    });

    it('should return studio with required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?limit=1`);
      const data = await response.json();
      
      if (data.studios && data.studios.length > 0) {
        const studio = data.studios[0];
        expect(studio).toHaveProperty('id');
        expect(studio).toHaveProperty('name');
        expect(studio).toHaveProperty('address'); // Should be abbreviated
        expect(studio).not.toHaveProperty('full_address'); // Privacy check
        expect(studio).toHaveProperty('studio_studio_types');
        expect(studio).toHaveProperty('studio_images');
      }
      
      expect(response.status).toBe(200);
    });

    it('should include map markers', async () => {
      const response = await fetch(`${BASE_URL}/api/studios/search?location=London&radius=10`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      if (data.mapMarkers) {
        expect(Array.isArray(data.mapMarkers)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${BASE_URL}/api/search/suggestions?q=`);
      expect(response.status).toBeLessThan(500); // Should not crash
    });

    it('should return valid JSON for all requests', async () => {
      const endpoints = [
        '/api/search/suggestions?q=test',
        '/api/search/users?q=test',
        '/api/studios/search?limit=1',
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${BASE_URL}${endpoint}`);
        const contentType = response.headers.get('content-type');
        expect(contentType).toContain('application/json');
        
        // Should parse without error
        await expect(response.json()).resolves.toBeDefined();
      }
    });
  });
});

