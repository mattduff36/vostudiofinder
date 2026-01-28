/**
 * Unit tests for Admin Studio Update Geocoding Logic
 * @jest-environment node
 */

import {
  detectManualCoordinateOverride,
  parseRequestCoordinates,
} from '@/lib/admin/studios/update/geocoding';

describe('Admin Studio Update Geocoding', () => {
  describe('parseRequestCoordinates', () => {
    it('should parse string coordinates', () => {
      const result = parseRequestCoordinates('51.5074', '-0.1278');
      expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
    });

    it('should parse number coordinates', () => {
      const result = parseRequestCoordinates(51.5074, -0.1278);
      expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
    });

    it('should return null for empty string coordinates', () => {
      const result = parseRequestCoordinates('', '');
      expect(result).toEqual({ lat: null, lng: null });
    });

    it('should return null for undefined coordinates', () => {
      const result = parseRequestCoordinates(undefined, undefined);
      expect(result).toEqual({ lat: null, lng: null });
    });

    it('should return null for null coordinates', () => {
      const result = parseRequestCoordinates(null, null);
      expect(result).toEqual({ lat: null, lng: null });
    });

    it('should handle mixed types', () => {
      const result = parseRequestCoordinates('51.5074', -0.1278);
      expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
    });
  });

  describe('detectManualCoordinateOverride', () => {
    it('should detect latitude change beyond epsilon', () => {
      const existingLat = 51.5074;
      const existingLng = -0.1278;
      const requestLat = 51.5075; // Changed
      const requestLng = -0.1278;

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(true);
    });

    it('should detect longitude change beyond epsilon', () => {
      const existingLat = 51.5074;
      const existingLng = -0.1278;
      const requestLat = 51.5074;
      const requestLng = -0.1279; // Changed

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(true);
    });

    it('should not detect change within epsilon', () => {
      const existingLat = 51.5074;
      const existingLng = -0.1278;
      const requestLat = 51.50740000001; // Within epsilon
      const requestLng = -0.12780000001; // Within epsilon

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(false);
    });

    it('should return false when request coordinates are null', () => {
      const existingLat = 51.5074;
      const existingLng = -0.1278;
      const requestLat = null;
      const requestLng = null;

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(false);
    });

    it('should return false when existing coordinates are null', () => {
      const existingLat = null;
      const existingLng = null;
      const requestLat = 51.5074;
      const requestLng = -0.1278;

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(false);
    });

    it('should detect change when only latitude is provided', () => {
      const existingLat = 51.5074;
      const existingLng = -0.1278;
      const requestLat = 51.5075; // Changed
      const requestLng = null;

      const result = detectManualCoordinateOverride(
        existingLat,
        existingLng,
        requestLat,
        requestLng
      );

      expect(result).toBe(true);
    });
  });
});
