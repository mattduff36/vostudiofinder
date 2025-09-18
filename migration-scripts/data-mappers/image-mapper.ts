import { idGenerator } from '../utils/id-generator';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

/**
 * Image Data Mapper
 * Maps legacy studio_gallery to StudioImage model
 */

export interface LegacyStudioImage {
  id: number;
  user_id: number;
  image_type?: string;
  image_filename?: string;
  cloudinary_url?: string;
  cloudinary_public_id?: string;
  is_primary?: number;
  display_order?: number;
  created_at?: string;
}

export interface MappedStudioImage {
  id: string;
  studioId: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
}

export class ImageMapper {
  private userIdMap: Map<number, string>;
  private studioIdMap: Map<string, string>; // userId -> studioId
  
  constructor(userIdMap: Map<number, string>) {
    this.userIdMap = userIdMap;
    this.studioIdMap = new Map();
  }

  /**
   * Set the studio ID mappings (userId -> studioId)
   */
  setStudioIdMap(studioIdMap: Map<string, string>): void {
    this.studioIdMap = studioIdMap;
  }

  /**
   * Map a single legacy studio image to Prisma format
   */
  mapImage(legacyImage: LegacyStudioImage): MappedStudioImage | null {
    const newUserId = this.userIdMap.get(legacyImage.user_id);
    if (!newUserId) {
      migrationLogger.warn(`No user mapping found for image ${legacyImage.id}`, 'IMAGE_MAPPER', {
        imageId: legacyImage.id,
        legacyUserId: legacyImage.user_id
      });
      return null;
    }

    const studioId = this.studioIdMap.get(newUserId);
    if (!studioId) {
      migrationLogger.warn(`No studio mapping found for image ${legacyImage.id}`, 'IMAGE_MAPPER', {
        imageId: legacyImage.id,
        userId: newUserId
      });
      return null;
    }

    // Determine image URL
    let imageUrl = '';
    if (legacyImage.cloudinary_url) {
      imageUrl = legacyImage.cloudinary_url;
    } else if (legacyImage.image_filename) {
      // Construct URL from filename (assuming it's stored in a known location)
      imageUrl = `https://res.cloudinary.com/voiceoverstudiofinder/image/upload/${legacyImage.image_filename}`;
    } else {
      migrationLogger.warn(`No valid image URL found for image ${legacyImage.id}`, 'IMAGE_MAPPER');
      return null;
    }

    // Generate alt text
    let altText = `Studio image`;
    if (legacyImage.image_type) {
      altText = `Studio ${legacyImage.image_type.toLowerCase()} image`;
    }

    // Determine sort order
    let sortOrder = legacyImage.display_order || 0;
    if (legacyImage.is_primary === 1) {
      sortOrder = 0; // Primary images get first position
    }

    const newId = idGenerator.generateId();

    return {
      id: newId,
      studioId,
      imageUrl,
      altText,
      sortOrder,
    };
  }

  /**
   * Map multiple legacy images
   */
  mapImages(legacyImages: LegacyStudioImage[]): MappedStudioImage[] {
    migrationLogger.info(`Mapping ${legacyImages.length} legacy studio images`, 'IMAGE_MAPPER');
    
    const mappedImages: MappedStudioImage[] = [];
    
    for (const legacyImage of legacyImages) {
      try {
        const mappedImage = this.mapImage(legacyImage);
        if (mappedImage) {
          mappedImages.push(mappedImage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        migrationLogger.error(`Failed to map image ${legacyImage.id}`, 'IMAGE_MAPPER', {
          error: errorMessage,
          legacyImage: { id: legacyImage.id, user_id: legacyImage.user_id }
        });
      }
    }
    
    // Sort images by studio and then by sort order
    mappedImages.sort((a, b) => {
      if (a.studioId !== b.studioId) {
        return a.studioId.localeCompare(b.studioId);
      }
      return a.sortOrder - b.sortOrder;
    });
    
    migrationLogger.info(`Successfully mapped ${mappedImages.length} studio images`, 'IMAGE_MAPPER');
    return mappedImages;
  }

  /**
   * Migrate images to Prisma database
   */
  async migrateImages(mappedImages: MappedStudioImage[]): Promise<void> {
    migrationLogger.info(`Starting migration of ${mappedImages.length} studio images`, 'IMAGE_MAPPER');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const image of mappedImages) {
      try {
        await db.studioImage.create({
          data: {
            id: image.id,
            studioId: image.studioId,
            imageUrl: image.imageUrl,
            altText: image.altText || null,
            sortOrder: image.sortOrder,
          }
        });
        
        successCount++;
        
        if (successCount % 25 === 0) {
          migrationLogger.info(`Migrated ${successCount}/${mappedImages.length} images`, 'IMAGE_MAPPER');
        }
        
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        migrationLogger.error(`Failed to migrate image ${image.id}`, 'IMAGE_MAPPER', {
          error: errorMessage,
          image: { id: image.id, studioId: image.studioId, imageUrl: image.imageUrl }
        });
      }
    }
    
    migrationLogger.info(`Image migration completed`, 'IMAGE_MAPPER', {
      total: mappedImages.length,
      success: successCount,
      errors: errorCount
    });
    
    if (errorCount > 0) {
      throw new Error(`Image migration completed with ${errorCount} errors`);
    }
  }

  /**
   * Get image statistics
   */
  getImageStatistics(mappedImages: MappedStudioImage[]): any {
    const studioImageCounts = new Map<string, number>();
    let cloudinaryImages = 0;
    let primaryImages = 0;

    for (const image of mappedImages) {
      // Count images per studio
      const currentCount = studioImageCounts.get(image.studioId) || 0;
      studioImageCounts.set(image.studioId, currentCount + 1);

      // Count Cloudinary images
      if (image.imageUrl.includes('cloudinary.com')) {
        cloudinaryImages++;
      }

      // Count primary images (sortOrder 0)
      if (image.sortOrder === 0) {
        primaryImages++;
      }
    }

    return {
      totalImages: mappedImages.length,
      studiosWithImages: studioImageCounts.size,
      cloudinaryImages,
      primaryImages,
      averageImagesPerStudio: mappedImages.length / Math.max(studioImageCounts.size, 1),
      maxImagesPerStudio: Math.max(...Array.from(studioImageCounts.values()), 0),
    };
  }

  /**
   * Clean legacy image data before mapping
   */
  cleanLegacyImageData(legacyImages: LegacyStudioImage[]): LegacyStudioImage[] {
    return legacyImages.filter(image => {
      // Filter out images without user mapping
      if (!this.userIdMap.has(image.user_id)) {
        migrationLogger.warn(`Filtering out image without user mapping`, 'IMAGE_MAPPER', {
          imageId: image.id,
          userId: image.user_id
        });
        return false;
      }

      // Filter out images without valid URLs
      if (!image.cloudinary_url && !image.image_filename) {
        migrationLogger.warn(`Filtering out image without valid URL`, 'IMAGE_MAPPER', {
          imageId: image.id,
          userId: image.user_id
        });
        return false;
      }
      
      return true;
    });
  }

  /**
   * Validate Cloudinary URLs
   */
  validateCloudinaryUrls(mappedImages: MappedStudioImage[]): { valid: number; invalid: number } {
    let valid = 0;
    let invalid = 0;

    for (const image of mappedImages) {
      try {
        new URL(image.imageUrl);
        if (image.imageUrl.includes('cloudinary.com')) {
          valid++;
        } else {
          // Non-Cloudinary URLs are considered valid if they're proper URLs
          valid++;
        }
      } catch {
        invalid++;
        migrationLogger.warn(`Invalid image URL found`, 'IMAGE_MAPPER', {
          imageId: image.id,
          imageUrl: image.imageUrl
        });
      }
    }

    return { valid, invalid };
  }
}

// ImageMapper is already exported above
