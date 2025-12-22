/**
 * Accessibility Test Suite
 * Tests image alt text improvements
 */

import { describe, it, expect } from '@jest/globals';
import { generateStudioImageAlt } from '../src/lib/utils/image-alt';

describe('Accessibility - Image Alt Text', () => {
  describe('generateStudioImageAlt utility', () => {
    it('should use custom alt text if provided', () => {
      const result = generateStudioImageAlt(
        'Test Studio',
        'London, UK',
        'Custom alt text'
      );
      expect(result).toBe('Custom alt text');
    });

    it('should generate alt text with studio name and city', () => {
      const result = generateStudioImageAlt(
        'VoiceOver Guy Studio',
        '123 Main St, London, SW1A 1AA, UK'
      );
      expect(result).toContain('VoiceOver Guy Studio');
      expect(result).toContain('London');
    });

    it('should handle image index for multiple images', () => {
      const result = generateStudioImageAlt(
        'Test Studio',
        'London, UK',
        null,
        1
      );
      expect(result).toContain('Test Studio');
      expect(result).toContain('Image 2');
    });

    it('should fall back gracefully for missing location', () => {
      const result = generateStudioImageAlt(
        'Test Studio',
        null
      );
      expect(result).toBe('Test Studio Studio');
    });

    it('should use abbreviated address when city extraction fails', () => {
      const result = generateStudioImageAlt(
        'Test Studio',
        'Some Location'
      );
      expect(result).toContain('Test Studio');
    });

    it('should handle empty custom alt text', () => {
      const result = generateStudioImageAlt(
        'Test Studio',
        'London, UK',
        '   ' // whitespace only
      );
      expect(result).toContain('Test Studio');
      expect(result).toContain('London');
    });

    it('should extract city from complex addresses', () => {
      const addresses = [
        '123 Main St, Birmingham, B1 1AA, UK',
        '456 Oak Ave, Manchester, M1 1AA',
        '789 Elm St, Edwinstowe, Nottingham, NG21 9PR, UK',
      ];

      const expectedCities = ['Birmingham', 'Manchester', 'Nottingham'];

      addresses.forEach((address, index) => {
        const result = generateStudioImageAlt('Test Studio', address);
        expect(result).toContain(expectedCities[index]);
      });
    });
  });

  describe('Image Alt Text in Components', () => {
    it('should not have generic "Studio image" alt text', async () => {
      // This test would check rendered components
      // For now, we validate the utility works correctly
      const genericAlt = generateStudioImageAlt('', null);
      expect(genericAlt).not.toBe('Studio image');
    });

    it('should always return non-empty alt text', () => {
      const testCases = [
        { name: 'Test Studio', location: 'London' },
        { name: 'Another Studio', location: null },
        { name: 'Studio Name', location: '123 Main St, City, ZIP' },
      ];

      testCases.forEach(testCase => {
        const result = generateStudioImageAlt(testCase.name, testCase.location);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});

