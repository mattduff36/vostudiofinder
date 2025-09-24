import { idGenerator } from '../utils/id-generator';
import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';

/**
 * Profile Data Mapper
 * Maps legacy Turso profile data to Prisma UserProfile model
 */

export interface LegacyProfile {
  id: number;
  user_id: number;
  firstname?: string;
  lastname?: string;
  phone?: string;
  bio?: string;
  about?: string;
  short_about?: string;
  location?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  vimeo?: string;
  soundcloud?: string;
  rate1?: number;
  rate2?: number;
  rate3?: number;
  show_rates?: number;
  crb_checked?: number;
  featured?: number;
  spotlight?: number;
  verification_level?: number;
  homestudio?: string;
  homestudio2?: string;
  homestudio3?: string;
  equipment?: string;
  services?: string;
  show_email?: number;
  show_phone?: number;
  show_address?: number;
  created?: string;
  updated?: string;
  // Additional fields that might exist
  profile_type?: string;
  specialties?: string;
  experience_years?: number;
}

export interface MappedProfile {
  id: string;
  userId: string;
  studioName: string | null;
  lastName: string | null;
  phone: string | null;
  about: string | null;
  shortAbout: string | null;
  location: string | null;
  rateTier1: string | null;
  rateTier2: string | null;
  rateTier3: string | null;
  showRates: boolean;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  vimeoUrl: string | null;
  soundcloudUrl: string | null;
  isCrbChecked: boolean;
  isFeatured: boolean;
  isSpotlight: boolean;
  verificationLevel: string;
  homeStudioDescription: string | null;
  equipmentList: string | null;
  servicesOffered: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProfileCategory = 'STUDIO_OWNER' | 'VOICEOVER' | 'OTHER';

export class ProfileMapper {
  private userIdMap: Map<number, string>;
  
  constructor(userIdMap: Map<number, string>) {
    this.userIdMap = userIdMap;
  }

  /**
   * Map a single legacy profile to Prisma format
   */
  mapProfile(legacyProfile: LegacyProfile): MappedProfile | null {
    const newUserId = this.userIdMap.get(legacyProfile.user_id);
    if (!newUserId) {
      migrationLogger.warn(`No user mapping found for profile ${legacyProfile.id}`, 'PROFILE_MAPPER', {
        profileId: legacyProfile.id,
        legacyUserId: legacyProfile.user_id
      });
      return null;
    }

    const newId = idGenerator.generateId();

    // Combine bio and about fields
    let about = legacyProfile.about || legacyProfile.bio;
    if (about && about.length > 2000) {
      about = about.substring(0, 2000);
    }

    // Combine home studio descriptions
    let homeStudioDescription = '';
    if (legacyProfile.homestudio) homeStudioDescription += legacyProfile.homestudio;
    if (legacyProfile.homestudio2) {
      if (homeStudioDescription) homeStudioDescription += '\n\n';
      homeStudioDescription += legacyProfile.homestudio2;
    }
    if (legacyProfile.homestudio3) {
      if (homeStudioDescription) homeStudioDescription += '\n\n';
      homeStudioDescription += legacyProfile.homestudio3;
    }

    // Parse dates
    const createdAt = legacyProfile.created ? new Date(legacyProfile.created) : new Date();
    const updatedAt = legacyProfile.updated ? new Date(legacyProfile.updated) : createdAt;

    return {
      id: newId,
      userId: newUserId,
      studioName: legacyProfile.firstname || null,
      lastName: legacyProfile.lastname || null,
      phone: legacyProfile.phone || null,
      about: about || null,
      shortAbout: legacyProfile.short_about || null,
      location: legacyProfile.location || null,
      rateTier1: legacyProfile.rate1 ? String(legacyProfile.rate1) : null,
      rateTier2: legacyProfile.rate2 ? String(legacyProfile.rate2) : null,
      rateTier3: legacyProfile.rate3 ? String(legacyProfile.rate3) : null,
      showRates: legacyProfile.show_rates === 1,
      facebookUrl: this.sanitizeUrl(legacyProfile.facebook),
      twitterUrl: this.sanitizeUrl(legacyProfile.twitter),
      linkedinUrl: this.sanitizeUrl(legacyProfile.linkedin),
      instagramUrl: this.sanitizeUrl(legacyProfile.instagram),
      youtubeUrl: this.sanitizeUrl(legacyProfile.youtube),
      vimeoUrl: this.sanitizeUrl(legacyProfile.vimeo),
      soundcloudUrl: this.sanitizeUrl(legacyProfile.soundcloud),
      isCrbChecked: legacyProfile.crb_checked === 1,
      isFeatured: legacyProfile.featured === 1,
      isSpotlight: legacyProfile.spotlight === 1,
      verificationLevel: this.mapVerificationLevel(legacyProfile.verification_level || 0),
      homeStudioDescription: homeStudioDescription || null,
      equipmentList: legacyProfile.equipment || null,
      servicesOffered: legacyProfile.services || null,
      showEmail: legacyProfile.show_email === 1,
      showPhone: legacyProfile.show_phone === 1,
      showAddress: legacyProfile.show_address === 1,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Map multiple legacy profiles
   */
  mapProfiles(legacyProfiles: LegacyProfile[]): MappedProfile[] {
    migrationLogger.info(`Mapping ${legacyProfiles.length} legacy profiles`, 'PROFILE_MAPPER');
    
    const mappedProfiles: MappedProfile[] = [];
    
    for (const legacyProfile of legacyProfiles) {
      try {
        const mappedProfile = this.mapProfile(legacyProfile);
        if (mappedProfile) {
          mappedProfiles.push(mappedProfile);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        migrationLogger.error(`Failed to map profile ${legacyProfile.id}`, 'PROFILE_MAPPER', {
          error: errorMessage,
          legacyProfile: { id: legacyProfile.id, user_id: legacyProfile.user_id }
        });
      }
    }
    
    migrationLogger.info(`Successfully mapped ${mappedProfiles.length} profiles`, 'PROFILE_MAPPER');
    return mappedProfiles;
  }

  /**
   * Migrate profiles to Prisma database
   */
  async migrateProfiles(mappedProfiles: MappedProfile[]): Promise<void> {
    migrationLogger.info(`Starting migration of ${mappedProfiles.length} profiles`, 'PROFILE_MAPPER');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const profile of mappedProfiles) {
      try {
        await db.userProfile.create({
          data: {
            id: profile.id,
            userId: profile.userId,
            studioName: profile.studioName,
            lastName: profile.lastName,
            phone: profile.phone,
            about: profile.about,
            shortAbout: profile.shortAbout,
            location: profile.location,
            rateTier1: profile.rateTier1,
            rateTier2: profile.rateTier2,
            rateTier3: profile.rateTier3,
            showRates: profile.showRates,
            facebookUrl: profile.facebookUrl,
            twitterUrl: profile.twitterUrl,
            linkedinUrl: profile.linkedinUrl,
            instagramUrl: profile.instagramUrl,
            youtubeUrl: profile.youtubeUrl,
            vimeoUrl: profile.vimeoUrl,
            soundcloudUrl: profile.soundcloudUrl,
            isCrbChecked: profile.isCrbChecked,
            isFeatured: profile.isFeatured,
            isSpotlight: profile.isSpotlight,
            verificationLevel: profile.verificationLevel,
            homeStudioDescription: profile.homeStudioDescription,
            equipmentList: profile.equipmentList,
            servicesOffered: profile.servicesOffered,
            showEmail: profile.showEmail,
            showPhone: profile.showPhone,
            showAddress: profile.showAddress,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          }
        });
        
        successCount++;
        
        if (successCount % 50 === 0) {
          migrationLogger.info(`Migrated ${successCount}/${mappedProfiles.length} profiles`, 'PROFILE_MAPPER');
        }
        
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        migrationLogger.error(`Failed to migrate profile ${profile.id}`, 'PROFILE_MAPPER', {
          error: errorMessage,
          profile: { id: profile.id, userId: profile.userId }
        });
      }
    }
    
    migrationLogger.info(`Profile migration completed`, 'PROFILE_MAPPER', {
      total: mappedProfiles.length,
      success: successCount,
      errors: errorCount
    });
    
    if (errorCount > 0) {
      throw new Error(`Profile migration completed with ${errorCount} errors`);
    }
  }

  /**
   * Categorize profile based on available data
   */
  categorizeProfile(legacyProfile: LegacyProfile): ProfileCategory {
    // Check for studio indicators
    const hasStudioInfo = !!(
      legacyProfile.homestudio || 
      legacyProfile.homestudio2 || 
      legacyProfile.homestudio3 ||
      legacyProfile.equipment
    );

    // Check for voiceover indicators
    const hasVoiceoverInfo = !!(
      legacyProfile.services?.toLowerCase().includes('voiceover') ||
      legacyProfile.services?.toLowerCase().includes('voice over') ||
      legacyProfile.services?.toLowerCase().includes('voice-over') ||
      legacyProfile.about?.toLowerCase().includes('voiceover') ||
      legacyProfile.about?.toLowerCase().includes('voice over') ||
      legacyProfile.bio?.toLowerCase().includes('voiceover')
    );

    // Check for rates (common for voiceover artists)
    const hasRates = !!(legacyProfile.rate1 || legacyProfile.rate2 || legacyProfile.rate3);

    if (hasStudioInfo) {
      return 'STUDIO_OWNER';
    } else if (hasVoiceoverInfo || hasRates) {
      return 'VOICEOVER';
    } else {
      return 'OTHER';
    }
  }

  /**
   * Sanitize URL to ensure it's valid
   */
  private sanitizeUrl(url?: string): string | null {
    if (!url) return null;
    
    url = url.trim();
    if (!url) return null;
    
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Basic URL validation
    try {
      new URL(url);
      return url;
    } catch {
      migrationLogger.warn(`Invalid URL sanitized`, 'PROFILE_MAPPER', { originalUrl: url });
      return null;
    }
  }

  /**
   * Map numeric verification level to string
   */
  private mapVerificationLevel(level: number): string {
    switch (level) {
      case 0:
        return 'none';
      case 1:
        return 'basic';
      case 2:
        return 'verified';
      case 3:
        return 'premium';
      default:
        return 'none';
    }
  }

  /**
   * Clean up legacy profile data before mapping
   */
  cleanLegacyProfileData(legacyProfiles: LegacyProfile[]): LegacyProfile[] {
    return legacyProfiles.filter(profile => {
      // Filter out profiles without user mapping
      if (!this.userIdMap.has(profile.user_id)) {
        migrationLogger.warn(`Filtering out profile without user mapping`, 'PROFILE_MAPPER', {
          profileId: profile.id,
          userId: profile.user_id
        });
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get profile statistics by category
   */
  getProfileStatistics(legacyProfiles: LegacyProfile[]): Record<ProfileCategory, number> {
    const stats: Record<ProfileCategory, number> = {
      'STUDIO_OWNER': 0,
      'VOICEOVER': 0,
      'OTHER': 0
    };

    for (const profile of legacyProfiles) {
      const category = this.categorizeProfile(profile);
      stats[category]++;
    }

    return stats;
  }
}

// ProfileMapper is already exported above
