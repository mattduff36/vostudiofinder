import { idGenerator } from '../utils/id-generator';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

/**
 * Studio Data Mapper
 * Extracts studio information from legacy profile data and creates Studio records
 */

export interface LegacyProfileForStudio {
  user_id: number;
  first_name?: string;
  last_name?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  url?: string;
  about?: string;
  shortabout?: string;
  homestudio?: string;
  homestudio2?: string;
  homestudio3?: string;
  homestudio4?: string;
  homestudio5?: string;
  homestudio6?: string;
  verified?: boolean;
  featured?: boolean;
  lastupdated?: string;
}

export interface MappedStudio {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  studioType: 'HOME_STUDIO' | 'COMMERCIAL_STUDIO' | 'MOBILE_STUDIO';
  address?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  phone?: string;
  isPremium: boolean;
  isVerified: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: Date;
  updatedAt: Date;
}

export class StudioMapper {
  private userIdMap: Map<number, string>;
  
  constructor(userIdMap: Map<number, string>) {
    this.userIdMap = userIdMap;
  }

  /**
   * Determine if a profile should have a studio created
   */
  shouldCreateStudio(profile: LegacyProfileForStudio): boolean {
    // Check for studio indicators
    const hasStudioInfo = !!(
      profile.homestudio || 
      profile.homestudio2 || 
      profile.homestudio3 ||
      profile.homestudio4 ||
      profile.homestudio5 ||
      profile.homestudio6
    );

    // Check for location/address info that suggests a physical studio
    const hasLocationInfo = !!(profile.address || (profile.latitude && profile.longitude));

    return hasStudioInfo || hasLocationInfo;
  }

  /**
   * Map a single legacy profile to Studio format
   */
  mapStudio(profile: LegacyProfileForStudio): MappedStudio | null {
    const newUserId = this.userIdMap.get(profile.user_id);
    if (!newUserId) {
      migrationLogger.warn(`No user mapping found for studio profile ${profile.user_id}`, 'STUDIO_MAPPER');
      return null;
    }

    if (!this.shouldCreateStudio(profile)) {
      return null;
    }

    const newId = idGenerator.generateId();

    // Generate studio name
    let studioName = '';
    if (profile.first_name || profile.last_name) {
      studioName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      if (studioName) {
        studioName += ' Studio';
      }
    }
    if (!studioName && profile.location) {
      studioName = `${profile.location} Studio`;
    }
    if (!studioName) {
      studioName = 'Home Studio';
    }

    // Combine studio descriptions
    let description = '';
    const studioDescriptions = [
      profile.homestudio,
      profile.homestudio2,
      profile.homestudio3,
      profile.homestudio4,
      profile.homestudio5,
      profile.homestudio6
    ].filter(Boolean);

    if (studioDescriptions.length > 0) {
      description = studioDescriptions.join('\n\n');
    } else if (profile.about) {
      description = profile.about;
    } else if (profile.shortabout) {
      description = profile.shortabout;
    }

    // Determine studio type
    let studioType: 'HOME_STUDIO' | 'COMMERCIAL_STUDIO' | 'MOBILE_STUDIO' = 'HOME_STUDIO';
    const descriptionLower = description.toLowerCase();
    if (descriptionLower.includes('commercial') || descriptionLower.includes('professional studio')) {
      studioType = 'COMMERCIAL_STUDIO';
    } else if (descriptionLower.includes('mobile') || descriptionLower.includes('on-location')) {
      studioType = 'MOBILE_STUDIO';
    }

    // Clean coordinates
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (profile.latitude && profile.longitude) {
      latitude = Number(profile.latitude);
      longitude = Number(profile.longitude);
      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude) || 
          latitude < -90 || latitude > 90 || 
          longitude < -180 || longitude > 180) {
        latitude = undefined;
        longitude = undefined;
      }
    }

    // Parse dates
    const updatedAt = profile.lastupdated ? new Date(profile.lastupdated) : new Date();
    const createdAt = new Date(updatedAt.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before updated

    return {
      id: newId,
      ownerId: newUserId,
      name: studioName,
      description: description || undefined,
      studioType,
      address: profile.address || undefined,
      latitude,
      longitude,
      websiteUrl: this.sanitizeUrl(profile.url),
      phone: profile.phone || undefined,
      isPremium: profile.featured === true || profile.featured === 1,
      isVerified: profile.verified === true || profile.verified === 1,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    };
  }

  /**
   * Map multiple legacy profiles to studios
   */
  mapStudios(profiles: LegacyProfileForStudio[]): MappedStudio[] {
    migrationLogger.info(`Mapping studios from ${profiles.length} profiles`, 'STUDIO_MAPPER');
    
    const mappedStudios: MappedStudio[] = [];
    
    for (const profile of profiles) {
      try {
        const mappedStudio = this.mapStudio(profile);
        if (mappedStudio) {
          mappedStudios.push(mappedStudio);
        }
      } catch (error) {
        migrationLogger.error(`Failed to map studio for profile ${profile.user_id}`, 'STUDIO_MAPPER', {
          error: error.message,
          profile: { user_id: profile.user_id }
        });
      }
    }
    
    migrationLogger.info(`Successfully mapped ${mappedStudios.length} studios`, 'STUDIO_MAPPER');
    return mappedStudios;
  }

  /**
   * Migrate studios to Prisma database
   */
  async migrateStudios(mappedStudios: MappedStudio[]): Promise<void> {
    migrationLogger.info(`Starting migration of ${mappedStudios.length} studios`, 'STUDIO_MAPPER');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const studio of mappedStudios) {
      try {
        await db.studio.create({
          data: {
            id: studio.id,
            ownerId: studio.ownerId,
            name: studio.name,
            description: studio.description,
            studioType: studio.studioType,
            address: studio.address,
            latitude: studio.latitude,
            longitude: studio.longitude,
            websiteUrl: studio.websiteUrl,
            phone: studio.phone,
            isPremium: studio.isPremium,
            isVerified: studio.isVerified,
            status: studio.status,
            createdAt: studio.createdAt,
            updatedAt: studio.updatedAt,
          }
        });
        
        successCount++;
        
        if (successCount % 25 === 0) {
          migrationLogger.info(`Migrated ${successCount}/${mappedStudios.length} studios`, 'STUDIO_MAPPER');
        }
        
      } catch (error) {
        errorCount++;
        migrationLogger.error(`Failed to migrate studio ${studio.id}`, 'STUDIO_MAPPER', {
          error: error.message,
          studio: { id: studio.id, ownerId: studio.ownerId, name: studio.name }
        });
      }
    }
    
    migrationLogger.info(`Studio migration completed`, 'STUDIO_MAPPER', {
      total: mappedStudios.length,
      success: successCount,
      errors: errorCount
    });
    
    if (errorCount > 0) {
      throw new Error(`Studio migration completed with ${errorCount} errors`);
    }
  }

  /**
   * Get studio statistics by type
   */
  getStudioStatistics(mappedStudios: MappedStudio[]): Record<string, number> {
    const stats = {
      HOME_STUDIO: 0,
      COMMERCIAL_STUDIO: 0,
      MOBILE_STUDIO: 0,
      verified: 0,
      premium: 0,
      withLocation: 0,
    };

    for (const studio of mappedStudios) {
      stats[studio.studioType]++;
      if (studio.isVerified) stats.verified++;
      if (studio.isPremium) stats.premium++;
      if (studio.latitude && studio.longitude) stats.withLocation++;
    }

    return stats;
  }

  /**
   * Sanitize URL to ensure it's valid
   */
  private sanitizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    
    url = url.trim();
    if (!url) return undefined;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch {
      migrationLogger.warn(`Invalid studio URL sanitized`, 'STUDIO_MAPPER', { originalUrl: url });
      return undefined;
    }
  }

  /**
   * Clean legacy profile data for studio mapping
   */
  cleanLegacyProfileData(profiles: LegacyProfileForStudio[]): LegacyProfileForStudio[] {
    return profiles.filter(profile => {
      // Filter out profiles without user mapping
      if (!this.userIdMap.has(profile.user_id)) {
        migrationLogger.warn(`Filtering out profile without user mapping for studio`, 'STUDIO_MAPPER', {
          userId: profile.user_id
        });
        return false;
      }
      
      return true;
    });
  }
}

// StudioMapper is already exported above
