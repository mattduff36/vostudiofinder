/**
 * Data Validation and Cleanup Utilities for Migration
 * Handles validation, cleaning, and transformation of legacy data
 */

export class DataValidators {
  
  /**
   * Validate and clean email addresses
   */
  static validateEmail(email: string | null | undefined): string | null {
    if (!email || typeof email !== 'string') return null;
    
    const cleaned = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    return emailRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Validate and clean usernames
   */
  static validateUsername(username: string | null | undefined): string | null {
    if (!username || typeof username !== 'string') return null;
    
    const cleaned = username.trim().toLowerCase();
    // Username should be 3-50 characters, alphanumeric with underscores/hyphens
    const usernameRegex = /^[a-z0-9_-]{3,50}$/;
    
    return usernameRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Validate and clean display names
   */
  static validateDisplayName(displayName: string | null | undefined): string | null {
    if (!displayName || typeof displayName !== 'string') return null;
    
    const cleaned = displayName.trim();
    // Display name should be 1-100 characters
    return cleaned.length > 0 && cleaned.length <= 100 ? cleaned : null;
  }

  /**
   * Validate and clean phone numbers
   */
  static validatePhone(phone: string | null | undefined): string | null {
    if (!phone || typeof phone !== 'string') return null;
    
    // Remove all non-digit characters except + at the beginning
    const cleaned = phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    
    // Should be 7-15 digits, optionally starting with +
    const phoneRegex = /^\+?\d{7,15}$/;
    
    return phoneRegex.test(cleaned) ? cleaned : null;
  }

  /**
   * Validate and clean URLs
   */
  static validateUrl(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    
    let cleaned = url.trim();
    
    // Add https:// if no protocol specified
    if (cleaned && !cleaned.match(/^https?:\/\//)) {
      cleaned = 'https://' + cleaned;
    }
    
    try {
      new URL(cleaned);
      return cleaned;
    } catch {
      return null;
    }
  }

  /**
   * Validate and clean text content
   */
  static validateText(text: string | null | undefined, maxLength: number = 1000): string | null {
    if (!text || typeof text !== 'string') return null;
    
    const cleaned = text.trim();
    return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null;
  }

  /**
   * Validate and clean boolean values from legacy data
   */
  static validateBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
  }

  /**
   * Validate and clean numeric values
   */
  static validateNumber(value: any, min?: number, max?: number): number | null {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (typeof num !== 'number' || isNaN(num)) return null;
    
    if (min !== undefined && num < min) return null;
    if (max !== undefined && num > max) return null;
    
    return num;
  }

  /**
   * Validate and clean latitude/longitude coordinates
   */
  static validateCoordinates(lat: any, lng: any): { lat: number; lng: number } | null {
    const latitude = this.validateNumber(lat, -90, 90);
    const longitude = this.validateNumber(lng, -180, 180);
    
    if (latitude === null || longitude === null) return null;
    
    return { lat: latitude, lng: longitude };
  }

  /**
   * Determine profile category based on legacy data
   */
  static determineProfileCategory(profile: any): 'STUDIO' | 'VOICEOVER' | 'OTHER' {
    // Check for studio-related indicators
    const hasStudioInfo = !!(
      profile.homestudio ||
      profile.homestudio2 ||
      profile.homestudio3 ||
      profile.address ||
      (profile.latitude && profile.longitude)
    );

    // Check for connection types (studio equipment/services)
    const hasStudioConnections = !!(
      profile.connection1 || // ISDN
      profile.connection2 || // Source Connect
      profile.connection3 || // Source Connect Now
      profile.connection4 || // Cleanfeed
      profile.connection5 || // Session Link Pro
      profile.connection6 || // Zoom
      profile.connection7 || // Skype
      profile.connection8    // Teams
    );

    // Check for voiceover-specific indicators
    const hasVoiceoverInfo = !!(
      profile.rates1 ||
      profile.rates2 ||
      profile.rates3 ||
      profile.showrates
    );

    // Categorization logic
    if (hasStudioInfo && hasStudioConnections) {
      return 'STUDIO';
    } else if (hasVoiceoverInfo && !hasStudioInfo) {
      return 'VOICEOVER';
    } else if (hasStudioInfo || hasStudioConnections) {
      return 'STUDIO';
    } else if (hasVoiceoverInfo) {
      return 'VOICEOVER';
    } else {
      return 'OTHER';
    }
  }

  /**
   * Clean and validate legacy date strings
   */
  static validateDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Extract and validate social media links
   */
  static extractSocialLinks(profile: any): {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    vimeo?: string;
    soundcloud?: string;
  } {
    const links: any = {};
    
    if (profile.facebook) links.facebook = this.validateUrl(profile.facebook);
    if (profile.twitter) links.twitter = this.validateUrl(profile.twitter);
    if (profile.linkedin) links.linkedin = this.validateUrl(profile.linkedin);
    if (profile.instagram) links.instagram = this.validateUrl(profile.instagram);
    if (profile.youtubepage || profile.youtube2) {
      links.youtube = this.validateUrl(profile.youtubepage || profile.youtube2);
    }
    if (profile.vimeo || profile.vimeo2) {
      links.vimeo = this.validateUrl(profile.vimeo || profile.vimeo2);
    }
    if (profile.soundcloud) links.soundcloud = this.validateUrl(profile.soundcloud);
    
    // Remove null values
    Object.keys(links).forEach(key => {
      if (links[key] === null) delete links[key];
    });
    
    return links;
  }

  /**
   * Validate and extract equipment/services information
   */
  static extractServices(profile: any): string[] {
    const services: string[] = [];
    
    if (this.validateBoolean(profile.connection1)) services.push('ISDN');
    if (this.validateBoolean(profile.connection2)) services.push('SOURCE_CONNECT');
    if (this.validateBoolean(profile.connection3)) services.push('SOURCE_CONNECT_NOW');
    if (this.validateBoolean(profile.connection4)) services.push('CLEANFEED');
    if (this.validateBoolean(profile.connection5)) services.push('SESSION_LINK_PRO');
    if (this.validateBoolean(profile.connection6)) services.push('ZOOM');
    if (this.validateBoolean(profile.connection7)) services.push('SKYPE');
    if (this.validateBoolean(profile.connection8)) services.push('TEAMS');
    
    return services;
  }

  /**
   * Log validation statistics
   */
  static logValidationStats(stats: {
    total: number;
    valid: number;
    invalid: number;
    cleaned: number;
  }, context: string): void {
    console.log(`📊 ${context} Validation Stats:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  Valid: ${stats.valid} (${((stats.valid / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Invalid: ${stats.invalid} (${((stats.invalid / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Cleaned: ${stats.cleaned} (${((stats.cleaned / stats.total) * 100).toFixed(1)}%)`);
  }
}

export default DataValidators;
