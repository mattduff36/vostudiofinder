/**
 * Admin Studio Update Request Types
 */

export interface AdminStudioUpdateInput {
  // User fields (root level)
  display_name?: string;
  username?: string;
  email?: string;
  avatar_image?: string;
  status?: string;
  
  // Studio types array
  studioTypes?: Array<{
    studio_type?: string;
    studioType?: string; // Accept both formats
  }>;
  
  // All profile/studio fields in _meta
  _meta?: {
    // Studio identification
    studio_name?: string;
    
    // Location
    address?: string; // Legacy
    full_address?: string;
    city?: string;
    location?: string; // Country
    latitude?: string | number;
    longitude?: string | number;
    show_exact_location?: string | boolean | number;
    
    // Contact
    phone?: string;
    url?: string; // Website
    
    // Profile content
    last_name?: string;
    about?: string;
    short_about?: string;
    shortabout?: string; // Legacy support
    
    // Social media
    facebook?: string;
    twitter?: string;
    x?: string;
    linkedin?: string;
    instagram?: string;
    youtubepage?: string;
    tiktok?: string;
    threads?: string;
    soundcloud?: string;
    vimeo?: string;
    
    // Status flags
    verified?: string | boolean | number;
    featured?: string | boolean | number;
    featured_expires_at?: string;
    is_profile_visible?: string | boolean | number;
    
    // Rates
    rates1?: string;
    rates2?: string;
    rates3?: string;
    showrates?: string | boolean | number;
    
    // Contact preferences
    showemail?: string | boolean | number;
    showphone?: string | boolean | number;
    showaddress?: string | boolean | number;
    showdirections?: string | boolean | number;
    use_coordinates_for_map?: string | boolean | number;
    
    // Connection types (legacy numeric flags)
    connection1?: string;
    connection2?: string;
    connection3?: string;
    connection4?: string;
    connection5?: string;
    connection6?: string;
    connection7?: string;
    connection8?: string;
    connection9?: string;
    connection10?: string;
    connection11?: string;
    connection12?: string;
    
    // Custom connection methods
    custom_connection_methods?: string[];
    
    // Equipment and services
    equipment_list?: string;
    services_offered?: string;
    
    // Membership
    membership_expires_at?: string | null;
    membership_tier?: 'BASIC' | 'PREMIUM';
    
    // SEO
    custom_meta_title?: string;
  };
  
  // Alternative format support
  profile?: {
    equipment_list?: string;
    services_offered?: string;
    x_url?: string;
  };
}

export interface EmailVerificationData {
  email: string;
  displayName: string;
  verificationUrl: string;
}

export interface GeocodingContext {
  existingStudio: {
    full_address: string | null;
    latitude: any;
    longitude: any;
  };
  requestBody: AdminStudioUpdateInput;
}
