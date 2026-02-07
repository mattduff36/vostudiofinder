/**
 * Admin Profile Adapter
 * Maps between admin API data structures and ProfileEditForm's ProfileData type
 */

export interface AdminProfileImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface AdminStudioType {
  studio_type: string;
}

export interface AdminProfileResponse {
  profile: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    email_verified: boolean;
    status: string;
    joined: string | Date;
    avatar_image: string | null;
    studioTypes: AdminStudioType[];
    name: string;
    _meta: {
      studio_name?: string;
      last_name?: string;
      equipment_list?: string;
      services_offered?: string;
      location?: string;
      full_address?: string;
      city?: string;
      phone?: string;
      url?: string;
      instagram?: string;
      youtubepage?: string;
      tiktok?: string;
      threads?: string;
      about?: string;
      latitude?: number | null;
      longitude?: number | null;
      show_exact_location?: string;
      short_about?: string;
      category?: string;
      facebook?: string;
      twitter?: string;
      x?: string;
      linkedin?: string;
      soundcloud?: string;
      vimeo?: string;
      verified?: string;
      featured?: string;
      featured_expires_at?: string | null;
      avatar_image?: string;
      rates1?: string | boolean;
      rates2?: string | boolean;
      rates3?: string | boolean;
      showrates?: string | boolean;
      showemail?: string;
      showphone?: string;
      showaddress?: string;
      showdirections?: string;
      use_coordinates_for_map?: boolean;
      is_profile_visible?: boolean;
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
      custom_connection_methods?: string[];
      membership_expires_at?: string | null;
      membership_tier?: string;
      custom_meta_title?: string;
    };
    images?: AdminProfileImage[];
  };
}

export interface ProfileData {
  user: {
    display_name: string;
    username: string;
    email: string;
    avatar_url?: string | null;
    email_verified?: boolean;
    status?: string;
  };
  profile: {
    phone?: string;
    about?: string;
    short_about?: string;
    location?: string;
    rate_tier_1?: number;
    rate_tier_2?: number;
    rate_tier_3?: number;
    show_rates: boolean;
    facebook_url?: string;
    x_url?: string;
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    tiktok_url?: string;
    threads_url?: string;
    soundcloud_url?: string;
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
    custom_connection_methods?: string[];
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions?: boolean;
    studio_name?: string;
    equipment_list?: string;
    services_offered?: string;
  };
  studio?: {
    name: string;
    description?: string;
    address?: string;
    full_address?: string;
    city?: string;
    latitude?: number | null;
    longitude?: number | null;
    show_exact_location?: boolean;
    website_url?: string;
    phone?: string;
    images?: AdminProfileImage[];
    is_profile_visible?: boolean;
    use_coordinates_for_map?: boolean;
    is_verified?: boolean;
    is_featured?: boolean;
    featured_until?: string | null;
    created_at?: string | Date;
  };
  studio_types: string[];
  metadata?: {
    custom_meta_title?: string;
  };
  // Admin-only fields
  _adminOnly?: {
    studioId: string;
    status: string;
    email_verified: boolean;
    membership_expires_at?: string | null;
    membership_tier?: string;
  };
}

/**
 * Convert admin API response to ProfileData format
 */
export function adminProfileToProfileData(response: AdminProfileResponse): ProfileData {
  const admin = response.profile;
  const meta = admin._meta;

  // Parse rates - remove currency symbols before parsing
  const parseRate = (rateStr: string | boolean | undefined): number | undefined => {
    // Handle falsy values (undefined, false, empty string, etc.)
    if (!rateStr) return undefined;
    // Handle boolean true (shouldn't happen, but be safe)
    if (typeof rateStr === 'boolean') return undefined;
    // Handle string
    if (typeof rateStr === 'string') {
      // Remove currency symbols and trim whitespace
      const cleaned = rateStr.replace(/[£$€¥₹]/g, '').trim();
      if (cleaned === '') return undefined;
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };
  
  const rateValue1 = parseRate(meta.rates1);
  const rateValue2 = parseRate(meta.rates2);
  const rateValue3 = parseRate(meta.rates3);

  return {
    user: {
      display_name: admin.display_name || '',
      username: admin.username || '',
      email: admin.email || '',
      avatar_url: admin.avatar_image || null,
      email_verified: admin.email_verified,
      status: admin.status,
    },
    profile: {
      phone: meta.phone || '',
      about: meta.about || '',
      short_about: meta.short_about || '',
      location: meta.location || '',
      ...(rateValue1 !== undefined ? { rate_tier_1: rateValue1 } : {}),
      ...(rateValue2 !== undefined ? { rate_tier_2: rateValue2 } : {}),
      ...(rateValue3 !== undefined ? { rate_tier_3: rateValue3 } : {}),
      show_rates: meta.showrates === '1' || meta.showrates === true,
      facebook_url: meta.facebook || '',
      x_url: meta.x || meta.twitter || '',
      linkedin_url: meta.linkedin || '',
      instagram_url: meta.instagram || '',
      youtube_url: meta.youtubepage || '',
      tiktok_url: meta.tiktok || '',
      threads_url: meta.threads || '',
      soundcloud_url: meta.soundcloud || '',
      connection1: meta.connection1 === '1' ? '1' : '0',
      connection2: meta.connection2 === '1' ? '1' : '0',
      connection3: meta.connection3 === '1' ? '1' : '0',
      connection4: meta.connection4 === '1' ? '1' : '0',
      connection5: meta.connection5 === '1' ? '1' : '0',
      connection6: meta.connection6 === '1' ? '1' : '0',
      connection7: meta.connection7 === '1' ? '1' : '0',
      connection8: meta.connection8 === '1' ? '1' : '0',
      connection9: meta.connection9 === '1' ? '1' : '0',
      connection10: meta.connection10 === '1' ? '1' : '0',
      connection11: meta.connection11 === '1' ? '1' : '0',
      connection12: meta.connection12 === '1' ? '1' : '0',
      custom_connection_methods: meta.custom_connection_methods || [],
      show_email: meta.showemail === '1',
      show_phone: meta.showphone === '1',
      show_address: meta.showaddress === '1',
      show_directions: meta.showdirections !== '0',
      studio_name: meta.studio_name || admin.name || '',
      equipment_list: meta.equipment_list || '',
      services_offered: meta.services_offered || '',
    },
    studio: {
      name: meta.studio_name || admin.name || '',
      description: meta.about || '',
      address: meta.full_address || '',
      full_address: meta.full_address || '',
      city: meta.city || '',
      latitude: meta.latitude || null,
      longitude: meta.longitude || null,
      show_exact_location: meta.show_exact_location === '1',
      website_url: meta.url || '',
      phone: meta.phone || '',
      images: admin.images || [],
      is_profile_visible: meta.is_profile_visible !== false,
      use_coordinates_for_map: meta.use_coordinates_for_map || false,
      is_verified: meta.verified === '1',
      is_featured: meta.featured === '1',
      featured_until: meta.featured_expires_at || null,
      ...(admin.joined ? { created_at: admin.joined } : {}),
    },
    studio_types: admin.studioTypes?.map(st => st.studio_type) || [],
    metadata: {
      custom_meta_title: meta.custom_meta_title || '',
    },
    _adminOnly: {
      studioId: admin.id,
      status: admin.status,
      email_verified: admin.email_verified,
      membership_expires_at: meta.membership_expires_at || null,
      membership_tier: meta.membership_tier || 'BASIC',
    },
  };
}

/**
 * Convert ProfileData back to admin API payload format
 */
export function profileDataToAdminPayload(data: ProfileData): any {
  return {
    display_name: data.user.display_name,
    username: data.user.username,
    email: data.user.email,
    avatar_image: data.user.avatar_url || '',
    status: data._adminOnly?.status,
    studioTypes: data.studio_types.map(type => ({ studio_type: type })),
    _meta: {
      studio_name: data.profile.studio_name || data.studio?.name || '',
      phone: data.profile.phone || '',
      about: data.profile.about || '',
      short_about: data.profile.short_about || '',
      location: data.profile.location || '',
      full_address: data.studio?.full_address || '',
      city: data.studio?.city || '',
      url: data.studio?.website_url || '',
      latitude: data.studio?.latitude,
      longitude: data.studio?.longitude,
      show_exact_location: data.studio?.show_exact_location ? '1' : '0',
      use_coordinates_for_map: data.studio?.use_coordinates_for_map || false,
      rates1: data.profile.rate_tier_1?.toString() || '',
      rates2: data.profile.rate_tier_2?.toString() || '',
      rates3: data.profile.rate_tier_3?.toString() || '',
      showrates: data.profile.show_rates ? '1' : '0',
      facebook: data.profile.facebook_url || '',
      x: data.profile.x_url || '',
      twitter: data.profile.x_url || '',
      linkedin: data.profile.linkedin_url || '',
      instagram: data.profile.instagram_url || '',
      youtubepage: data.profile.youtube_url || '',
      tiktok: data.profile.tiktok_url || '',
      threads: data.profile.threads_url || '',
      soundcloud: data.profile.soundcloud_url || '',
      connection1: data.profile.connection1 || '0',
      connection2: data.profile.connection2 || '0',
      connection3: data.profile.connection3 || '0',
      connection4: data.profile.connection4 || '0',
      connection5: data.profile.connection5 || '0',
      connection6: data.profile.connection6 || '0',
      connection7: data.profile.connection7 || '0',
      connection8: data.profile.connection8 || '0',
      connection9: data.profile.connection9 || '0',
      connection10: data.profile.connection10 || '0',
      connection11: data.profile.connection11 || '0',
      connection12: data.profile.connection12 || '0',
      custom_connection_methods: data.profile.custom_connection_methods || [],
      showemail: data.profile.show_email ? '1' : '0',
      showphone: data.profile.show_phone ? '1' : '0',
      showaddress: data.profile.show_address ? '1' : '0',
      showdirections: data.profile.show_directions !== false ? '1' : '0',
      equipment_list: data.profile.equipment_list || '',
      services_offered: data.profile.services_offered || '',
      verified: data.studio?.is_verified ? '1' : '0',
      featured: data.studio?.is_featured ? '1' : '0',
      featured_expires_at: data.studio?.featured_until || null,
      is_profile_visible: data.studio?.is_profile_visible !== false,
      membership_expires_at: data._adminOnly?.membership_expires_at || null,
      membership_tier: data._adminOnly?.membership_tier || 'BASIC',
      custom_meta_title: data.metadata?.custom_meta_title || '',
    },
  };
}
