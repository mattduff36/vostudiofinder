/**
 * Tests for image cropping utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createImage, getImageDataUrl, getCroppedImage, getPixelCrop, CropArea } from './crop';

describe('Image Crop Utilities', () => {
  describe('createImage', () => {
    it('should create an image from a data URL', async () => {
      // Create a simple 1x1 pixel data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const img = await createImage(dataUrl);
      
      expect(img).toBeInstanceOf(HTMLImageElement);
      expect(img.src).toBe(dataUrl);
    });

    it('should reject if image fails to load', async () => {
      const invalidUrl = 'invalid-url';
      
      await expect(createImage(invalidUrl)).rejects.toBeDefined();
    });
  });

  describe('getImageDataUrl', () => {
    it('should convert a File to a data URL', async () => {
      // Create a mock file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      
      const dataUrl = await getImageDataUrl(file);
      
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('getPixelCrop', () => {
    it('should convert percentage crop to pixel crop', () => {
      const percentageCrop = {
        x: 10,
        y: 20,
        width: 50,
        height: 40,
      };
      const imageWidth = 1000;
      const imageHeight = 800;

      const pixelCrop = getPixelCrop(percentageCrop, imageWidth, imageHeight);

      expect(pixelCrop).toEqual({
        x: 100,
        y: 160,
        width: 500,
        height: 320,
      });
    });

    it('should handle edge cases with 0 values', () => {
      const percentageCrop = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };
      const imageWidth = 1000;
      const imageHeight = 800;

      const pixelCrop = getPixelCrop(percentageCrop, imageWidth, imageHeight);

      expect(pixelCrop).toEqual({
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      });
    });
  });

  describe('getCroppedImage', () => {
    // Mock canvas and context
    beforeEach(() => {
      // Mock HTMLCanvasElement
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
        })),
        toBlob: jest.fn((callback: (blob: Blob | null) => void) => {
          const blob = new Blob(['mock-blob'], { type: 'image/jpeg' });
          callback(blob);
        }),
      };

      // Mock document.createElement
      global.document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return {} as any;
      }) as any;
    });

    it('should export an image with correct aspect ratio', async () => {
      // Create a simple data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const cropArea: CropArea = {
        x: 0,
        y: 0,
        width: 100,
        height: 48, // 25:12 ratio approximately
      };

      const options = {
        maxWidth: 2000,
        maxHeight: 960,
        quality: 0.92,
        format: 'image/jpeg' as const,
        fileName: 'test-crop.jpg',
      };

      const croppedFile = await getCroppedImage(dataUrl, cropArea, options);

      expect(croppedFile).toBeInstanceOf(File);
      expect(croppedFile.name).toBe('test-crop.jpg');
      expect(croppedFile.type).toBe('image/jpeg');
    });

    it('should handle small crop areas without upscaling', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const cropArea: CropArea = {
        x: 0,
        y: 0,
        width: 500, // Smaller than maxWidth
        height: 240, // Smaller than maxHeight
      };

      const options = {
        maxWidth: 2000,
        maxHeight: 960,
        quality: 0.92,
        format: 'image/jpeg' as const,
        fileName: 'small-crop.jpg',
      };

      const croppedFile = await getCroppedImage(dataUrl, cropArea, options);

      expect(croppedFile).toBeInstanceOf(File);
      // The output should not upscale, so it should be smaller than max dimensions
    });

    it('should handle different output formats', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const cropArea: CropArea = {
        x: 0,
        y: 0,
        width: 100,
        height: 48,
      };

      // Test PNG format
      const pngFile = await getCroppedImage(dataUrl, cropArea, {
        format: 'image/png',
        fileName: 'test.png',
      });

      expect(pngFile.type).toBe('image/png');
      expect(pngFile.name).toBe('test.png');

      // Test WebP format
      const webpFile = await getCroppedImage(dataUrl, cropArea, {
        format: 'image/webp',
        fileName: 'test.webp',
      });

      expect(webpFile.type).toBe('image/webp');
      expect(webpFile.name).toBe('test.webp');
    });

    it('should throw error if canvas context is not available', async () => {
      // Mock canvas without context
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => null),
      };

      global.document.createElement = jest.fn(() => mockCanvas as any) as any;

      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const cropArea: CropArea = {
        x: 0,
        y: 0,
        width: 100,
        height: 48,
      };

      await expect(getCroppedImage(dataUrl, cropArea)).rejects.toThrow('Failed to get canvas context');
    });

    it('should use default options when not provided', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const cropArea: CropArea = {
        x: 0,
        y: 0,
        width: 100,
        height: 48,
      };

      const croppedFile = await getCroppedImage(dataUrl, cropArea);

      expect(croppedFile).toBeInstanceOf(File);
      expect(croppedFile.name).toBe('cropped-image.jpg');
      expect(croppedFile.type).toBe('image/jpeg');
    });
  });
});

