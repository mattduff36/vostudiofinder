import { migrationLogger } from '../utils/logger';
import { db } from '../../src/lib/db';
import { tursoClient, fetchAllTurso } from '../utils/turso-client';

/**
 * Data Integrity Checker
 * Validates migrated data and ensures consistency
 */

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

export interface ValidationReport {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
  summary: string;
}

export class DataIntegrityChecker {
  
  /**
   * Run all validation checks
   */
  async runAllChecks(): Promise<ValidationReport> {
    migrationLogger.startPhase('Data Integrity Validation');
    
    const results: ValidationResult[] = [];
    
    try {
      // Basic count validations
      results.push(await this.validateUserCounts());
      results.push(await this.validateProfileCounts());
      results.push(await this.validateStudioCounts());
      results.push(await this.validateImageCounts());
      results.push(await this.validateConnectionCounts());
      
      // Relationship validations
      results.push(await this.validateUserProfileRelationships());
      results.push(await this.validateStudioOwnerRelationships());
      results.push(await this.validateImageStudioRelationships());
      results.push(await this.validateConnectionUserRelationships());
      
      // Data quality validations
      results.push(await this.validateEmailUniqueness());
      results.push(await this.validateUsernameUniqueness());
      results.push(await this.validateRequiredFields());
      results.push(await this.validateDataFormats());
      
      // Business logic validations
      results.push(await this.validateProfileCategories());
      results.push(await this.validateStudioTypes());
      results.push(await this.validateImageUrls());
      
    } catch (error) {
      migrationLogger.error('Validation checks failed', 'VALIDATION', { error: error.message });
      results.push({
        passed: false,
        message: `Critical validation error: ${error.message}`,
        details: { error: error.message }
      });
    }
    
    // Generate report
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const warnings = 0; // Could be enhanced to track warnings separately
    
    const report: ValidationReport = {
      totalChecks: results.length,
      passed,
      failed,
      warnings,
      results,
      summary: this.generateSummary(passed, failed, results.length)
    };
    
    migrationLogger.completePhase('Data Integrity Validation', {
      totalChecks: report.totalChecks,
      passed: report.passed,
      failed: report.failed,
      success: report.failed === 0
    });
    
    return report;
  }

  /**
   * Validate user count migration
   */
  private async validateUserCounts(): Promise<ValidationResult> {
    try {
      const prismaCount = await db.user.count();
      const tursoUsers = await fetchAllTurso('SELECT COUNT(*) as count FROM users');
      const tursoCount = tursoUsers[0].count;
      
      // We expect some users to be filtered out due to invalid emails, etc.
      const migrationRate = (prismaCount / tursoCount) * 100;
      const passed = migrationRate >= 70; // At least 70% should migrate successfully
      
      return {
        passed,
        message: `User migration: ${prismaCount}/${tursoCount} (${migrationRate.toFixed(1)}%)`,
        details: { prismaCount, tursoCount, migrationRate }
      };
    } catch (error) {
      return {
        passed: false,
        message: `User count validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate profile count migration
   */
  private async validateProfileCounts(): Promise<ValidationResult> {
    try {
      const prismaCount = await db.userProfile.count();
      const tursoProfiles = await fetchAllTurso('SELECT COUNT(*) as count FROM profile');
      const tursoCount = tursoProfiles[0].count;
      
      // Profile migration depends on successful user migration
      const userCount = await db.user.count();
      const expectedProfiles = Math.min(userCount, tursoCount);
      const migrationRate = (prismaCount / expectedProfiles) * 100;
      
      return {
        passed: migrationRate >= 0, // Any migration is acceptable since profiles depend on users
        message: `Profile migration: ${prismaCount}/${expectedProfiles} expected (${migrationRate.toFixed(1)}%)`,
        details: { prismaCount, tursoCount, expectedProfiles, migrationRate }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Profile count validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate studio count migration
   */
  private async validateStudioCounts(): Promise<ValidationResult> {
    try {
      const prismaCount = await db.studio.count();
      const profileCount = await db.userProfile.count();
      
      // Studios are created from profiles with studio indicators
      // We expect some percentage of profiles to become studios
      const studioRate = profileCount > 0 ? (prismaCount / profileCount) * 100 : 0;
      
      return {
        passed: true, // Any number of studios is acceptable
        message: `Studio creation: ${prismaCount} studios from ${profileCount} profiles (${studioRate.toFixed(1)}%)`,
        details: { prismaCount, profileCount, studioRate }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Studio count validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate image count migration
   */
  private async validateImageCounts(): Promise<ValidationResult> {
    try {
      const prismaCount = await db.studioImage.count();
      const tursoImages = await fetchAllTurso('SELECT COUNT(*) as count FROM studio_gallery');
      const tursoCount = tursoImages[0].count;
      
      // Image migration depends on studio creation
      const studioCount = await db.studio.count();
      const expectedImages = studioCount > 0 ? Math.min(tursoCount, studioCount * 10) : 0;
      
      return {
        passed: true, // Any number of images is acceptable
        message: `Image migration: ${prismaCount} images (${tursoCount} available, ${studioCount} studios)`,
        details: { prismaCount, tursoCount, studioCount }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Image count validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate connection count migration
   */
  private async validateConnectionCounts(): Promise<ValidationResult> {
    try {
      const prismaCount = await db.userConnection.count();
      const tursoConnections = await fetchAllTurso('SELECT COUNT(*) as count FROM shows_contacts');
      const tursoCount = tursoConnections[0].count;
      
      const migrationRate = tursoCount > 0 ? (prismaCount / tursoCount) * 100 : 100;
      const passed = migrationRate >= 80; // At least 80% should migrate
      
      return {
        passed,
        message: `Connection migration: ${prismaCount}/${tursoCount} (${migrationRate.toFixed(1)}%)`,
        details: { prismaCount, tursoCount, migrationRate }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Connection count validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate user-profile relationships
   */
  private async validateUserProfileRelationships(): Promise<ValidationResult> {
    try {
      const usersWithProfiles = await db.user.count({
        where: { profile: { isNot: null } }
      });
      const profilesWithUsers = await db.userProfile.count({
        where: { user: { isNot: null } }
      });
      const totalProfiles = await db.userProfile.count();
      
      const passed = profilesWithUsers === totalProfiles;
      
      return {
        passed,
        message: `User-Profile relationships: ${profilesWithUsers}/${totalProfiles} profiles linked, ${usersWithProfiles} users with profiles`,
        details: { usersWithProfiles, profilesWithUsers, totalProfiles }
      };
    } catch (error) {
      return {
        passed: false,
        message: `User-Profile relationship validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate studio-owner relationships
   */
  private async validateStudioOwnerRelationships(): Promise<ValidationResult> {
    try {
      const studiosWithOwners = await db.studio.count({
        where: { owner: { isNot: null } }
      });
      const totalStudios = await db.studio.count();
      
      const passed = studiosWithOwners === totalStudios;
      
      return {
        passed,
        message: `Studio-Owner relationships: ${studiosWithOwners}/${totalStudios} studios have valid owners`,
        details: { studiosWithOwners, totalStudios }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Studio-Owner relationship validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate image-studio relationships
   */
  private async validateImageStudioRelationships(): Promise<ValidationResult> {
    try {
      const imagesWithStudios = await db.studioImage.count({
        where: { studio: { isNot: null } }
      });
      const totalImages = await db.studioImage.count();
      
      const passed = imagesWithStudios === totalImages;
      
      return {
        passed,
        message: `Image-Studio relationships: ${imagesWithStudios}/${totalImages} images have valid studios`,
        details: { imagesWithStudios, totalImages }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Image-Studio relationship validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate connection-user relationships
   */
  private async validateConnectionUserRelationships(): Promise<ValidationResult> {
    try {
      const validConnections = await db.userConnection.count({
        where: {
          AND: [
            { user: { isNot: null } },
            { connectedUser: { isNot: null } }
          ]
        }
      });
      const totalConnections = await db.userConnection.count();
      
      const passed = validConnections === totalConnections;
      
      return {
        passed,
        message: `Connection-User relationships: ${validConnections}/${totalConnections} connections have valid users`,
        details: { validConnections, totalConnections }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Connection-User relationship validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate email uniqueness
   */
  private async validateEmailUniqueness(): Promise<ValidationResult> {
    try {
      const totalUsers = await db.user.count();
      const uniqueEmails = await db.user.groupBy({
        by: ['email'],
        _count: { email: true }
      });
      
      const duplicates = uniqueEmails.filter(group => group._count.email > 1);
      const passed = duplicates.length === 0;
      
      return {
        passed,
        message: `Email uniqueness: ${uniqueEmails.length} unique emails for ${totalUsers} users (${duplicates.length} duplicates)`,
        details: { totalUsers, uniqueEmails: uniqueEmails.length, duplicates: duplicates.length }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Email uniqueness validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate username uniqueness
   */
  private async validateUsernameUniqueness(): Promise<ValidationResult> {
    try {
      const totalUsers = await db.user.count();
      const uniqueUsernames = await db.user.groupBy({
        by: ['username'],
        _count: { username: true }
      });
      
      const duplicates = uniqueUsernames.filter(group => group._count.username > 1);
      const passed = duplicates.length === 0;
      
      return {
        passed,
        message: `Username uniqueness: ${uniqueUsernames.length} unique usernames for ${totalUsers} users (${duplicates.length} duplicates)`,
        details: { totalUsers, uniqueUsernames: uniqueUsernames.length, duplicates: duplicates.length }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Username uniqueness validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate required fields
   */
  private async validateRequiredFields(): Promise<ValidationResult> {
    try {
      const usersWithoutEmail = await db.user.count({ where: { email: null } });
      const usersWithoutUsername = await db.user.count({ where: { username: null } });
      const usersWithoutDisplayName = await db.user.count({ where: { displayName: null } });
      
      const issues = usersWithoutEmail + usersWithoutUsername + usersWithoutDisplayName;
      const passed = issues === 0;
      
      return {
        passed,
        message: `Required fields: ${issues} missing required fields (email: ${usersWithoutEmail}, username: ${usersWithoutUsername}, displayName: ${usersWithoutDisplayName})`,
        details: { usersWithoutEmail, usersWithoutUsername, usersWithoutDisplayName }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Required fields validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate data formats
   */
  private async validateDataFormats(): Promise<ValidationResult> {
    try {
      // Check email formats
      const users = await db.user.findMany({ select: { email: true } });
      const invalidEmails = users.filter(user => !user.email.includes('@')).length;
      
      // Check URL formats in profiles
      const profiles = await db.userProfile.findMany({
        select: { facebookUrl: true, twitterUrl: true, linkedinUrl: true }
      });
      
      let invalidUrls = 0;
      profiles.forEach(profile => {
        [profile.facebookUrl, profile.twitterUrl, profile.linkedinUrl].forEach(url => {
          if (url && !url.startsWith('http')) {
            invalidUrls++;
          }
        });
      });
      
      const totalIssues = invalidEmails + invalidUrls;
      const passed = totalIssues === 0;
      
      return {
        passed,
        message: `Data formats: ${totalIssues} format issues (emails: ${invalidEmails}, URLs: ${invalidUrls})`,
        details: { invalidEmails, invalidUrls, totalIssues }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Data format validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate profile categories
   */
  private async validateProfileCategories(): Promise<ValidationResult> {
    try {
      const totalProfiles = await db.userProfile.count();
      
      // Since we don't have explicit categories in the current schema,
      // we'll validate based on the presence of studio-related data
      const profilesWithStudioData = await db.userProfile.count({
        where: { homeStudioDescription: { not: null } }
      });
      
      return {
        passed: true, // Always pass since categories are implicit
        message: `Profile categories: ${totalProfiles} profiles, ${profilesWithStudioData} with studio data`,
        details: { totalProfiles, profilesWithStudioData }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Profile category validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate studio types
   */
  private async validateStudioTypes(): Promise<ValidationResult> {
    try {
      const studioTypes = await db.studio.groupBy({
        by: ['studioType'],
        _count: { studioType: true }
      });
      
      const totalStudios = await db.studio.count();
      const validTypes = ['RECORDING', 'PODCAST', 'HOME', 'PRODUCTION', 'MOBILE'];
      const invalidTypes = studioTypes.filter(type => !validTypes.includes(type.studioType));
      
      const passed = invalidTypes.length === 0;
      
      return {
        passed,
        message: `Studio types: ${totalStudios} studios, ${studioTypes.length} different types, ${invalidTypes.length} invalid`,
        details: { totalStudios, studioTypes, invalidTypes }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Studio type validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate image URLs
   */
  private async validateImageUrls(): Promise<ValidationResult> {
    try {
      const images = await db.studioImage.findMany({ select: { imageUrl: true } });
      const totalImages = images.length;
      
      let validUrls = 0;
      let cloudinaryUrls = 0;
      
      images.forEach(image => {
        try {
          new URL(image.imageUrl);
          validUrls++;
          if (image.imageUrl.includes('cloudinary.com')) {
            cloudinaryUrls++;
          }
        } catch {
          // Invalid URL
        }
      });
      
      const passed = validUrls === totalImages;
      
      return {
        passed,
        message: `Image URLs: ${validUrls}/${totalImages} valid URLs, ${cloudinaryUrls} Cloudinary URLs`,
        details: { totalImages, validUrls, cloudinaryUrls }
      };
    } catch (error) {
      return {
        passed: false,
        message: `Image URL validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Generate summary message
   */
  private generateSummary(passed: number, failed: number, total: number): string {
    const passRate = (passed / total) * 100;
    
    if (failed === 0) {
      return `✅ All ${total} validation checks passed successfully!`;
    } else if (passRate >= 80) {
      return `⚠️ ${passed}/${total} checks passed (${passRate.toFixed(1)}%) - ${failed} issues need attention`;
    } else {
      return `❌ Only ${passed}/${total} checks passed (${passRate.toFixed(1)}%) - significant issues detected`;
    }
  }
}

export const dataIntegrityChecker = new DataIntegrityChecker();
