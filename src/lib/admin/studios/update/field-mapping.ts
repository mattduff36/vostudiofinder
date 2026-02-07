import type { AdminStudioUpdateInput } from './types';

/**
 * Helper to normalize boolean values from various formats
 */
export function normalizeBoolean(value: string | boolean | number | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === '1' || value === true || value === 1;
}

/**
 * Builds user update data object from request body
 */
export function buildUserUpdate(
  body: AdminStudioUpdateInput
): Record<string, unknown> {
  const userUpdateData: Record<string, unknown> = {};
  
  if (body.display_name !== undefined) userUpdateData.display_name = body.display_name;
  if (body.username !== undefined) userUpdateData.username = body.username;
  if (body.avatar_image !== undefined) userUpdateData.avatar_url = body.avatar_image;
  if (body._meta?.membership_tier !== undefined) userUpdateData.membership_tier = body._meta.membership_tier;
  
  return userUpdateData;
}

/**
 * Builds studio_profiles update data object from request body (studio-level fields only)
 */
export function buildStudioUpdate(
  body: AdminStudioUpdateInput
): Record<string, unknown> {
  const studioUpdateData: Record<string, unknown> = {};
  
  if (body._meta?.studio_name !== undefined) studioUpdateData.name = body._meta.studio_name;
  if (body._meta?.address !== undefined) studioUpdateData.address = body._meta.address; // Legacy
  if (body._meta?.full_address !== undefined) studioUpdateData.full_address = body._meta.full_address;
  if (body._meta?.city !== undefined) studioUpdateData.city = body._meta.city;
  if (body._meta?.phone !== undefined) studioUpdateData.phone = body._meta.phone;
  if (body._meta?.url !== undefined) studioUpdateData.website_url = body._meta.url;
  if (body._meta?.latitude !== undefined) studioUpdateData.latitude = parseFloat(String(body._meta.latitude)) || null;
  if (body._meta?.longitude !== undefined) studioUpdateData.longitude = parseFloat(String(body._meta.longitude)) || null;
  if (body._meta?.show_exact_location !== undefined) {
    studioUpdateData.show_exact_location = normalizeBoolean(body._meta.show_exact_location);
  }
  if (body._meta?.verified !== undefined) {
    studioUpdateData.is_verified = normalizeBoolean(body._meta.verified);
  }
  if (body._meta?.is_profile_visible !== undefined) {
    studioUpdateData.is_profile_visible = normalizeBoolean(body._meta.is_profile_visible);
  }
  if (body.status !== undefined) {
    studioUpdateData.status = body.status.toUpperCase();
  }
  
  return studioUpdateData;
}

/**
 * Builds profile update data object from request body (profile-level fields)
 */
export function buildProfileUpdate(
  body: AdminStudioUpdateInput
): Record<string, unknown> {
  const profileUpdateData: Record<string, unknown> = {};
  
  // Profile content
  if (body._meta?.last_name !== undefined) profileUpdateData.last_name = body._meta.last_name;
  if (body._meta?.location !== undefined) profileUpdateData.location = body._meta.location;
  if (body._meta?.about !== undefined) profileUpdateData.about = body._meta.about;
  if (body._meta?.short_about !== undefined) profileUpdateData.short_about = body._meta.short_about;
  if (body._meta?.shortabout !== undefined) profileUpdateData.short_about = body._meta.shortabout; // Legacy
  
  // Social media
  if (body._meta?.facebook !== undefined) profileUpdateData.facebook_url = body._meta.facebook;
  if (body._meta?.x !== undefined) {
    profileUpdateData.x_url = body._meta.x;
    profileUpdateData.twitter_url = body._meta.x; // Keep legacy column in sync
  }
  if (body._meta?.linkedin !== undefined) profileUpdateData.linkedin_url = body._meta.linkedin;
  if (body._meta?.instagram !== undefined) profileUpdateData.instagram_url = body._meta.instagram;
  if (body._meta?.youtubepage !== undefined) profileUpdateData.youtube_url = body._meta.youtubepage;
  if (body._meta?.tiktok !== undefined) profileUpdateData.tiktok_url = body._meta.tiktok;
  if (body._meta?.threads !== undefined) profileUpdateData.threads_url = body._meta.threads;
  if (body._meta?.soundcloud !== undefined) profileUpdateData.soundcloud_url = body._meta.soundcloud;
  
  // Featured status
  if (body._meta?.featured !== undefined) {
    const isFeatured = normalizeBoolean(body._meta.featured) ?? false;
    profileUpdateData.is_featured = isFeatured;
    
    // Clear expiry when unfeaturing
    if (!isFeatured) {
      profileUpdateData.featured_until = null;
    }
  }
  
  // Featured expiry date
  if (body._meta?.featured_expires_at !== undefined) {
    profileUpdateData.featured_until = body._meta.featured_expires_at ? new Date(body._meta.featured_expires_at) : null;
  }
  
  // Rates
  if (body._meta?.rates1 !== undefined) profileUpdateData.rate_tier_1 = body._meta.rates1;
  if (body._meta?.rates2 !== undefined) profileUpdateData.rate_tier_2 = body._meta.rates2;
  if (body._meta?.rates3 !== undefined) profileUpdateData.rate_tier_3 = body._meta.rates3;
  if (body._meta?.showrates !== undefined) {
    profileUpdateData.show_rates = normalizeBoolean(body._meta.showrates);
  }
  
  // Contact preferences
  if (body._meta?.showemail !== undefined) {
    profileUpdateData.show_email = normalizeBoolean(body._meta.showemail);
  }
  if (body._meta?.showphone !== undefined) {
    profileUpdateData.show_phone = normalizeBoolean(body._meta.showphone);
  }
  if (body._meta?.showaddress !== undefined) {
    profileUpdateData.show_address = normalizeBoolean(body._meta.showaddress);
  }
  if (body._meta?.showdirections !== undefined) {
    profileUpdateData.show_directions = normalizeBoolean(body._meta.showdirections);
  }
  if (body._meta?.use_coordinates_for_map !== undefined) {
    profileUpdateData.use_coordinates_for_map = normalizeBoolean(body._meta.use_coordinates_for_map);
  }
  
  // Connection types
  if (body._meta?.connection1 !== undefined) profileUpdateData.connection1 = body._meta.connection1;
  if (body._meta?.connection2 !== undefined) profileUpdateData.connection2 = body._meta.connection2;
  if (body._meta?.connection3 !== undefined) profileUpdateData.connection3 = body._meta.connection3;
  if (body._meta?.connection4 !== undefined) profileUpdateData.connection4 = body._meta.connection4;
  if (body._meta?.connection5 !== undefined) profileUpdateData.connection5 = body._meta.connection5;
  if (body._meta?.connection6 !== undefined) profileUpdateData.connection6 = body._meta.connection6;
  if (body._meta?.connection7 !== undefined) profileUpdateData.connection7 = body._meta.connection7;
  if (body._meta?.connection8 !== undefined) profileUpdateData.connection8 = body._meta.connection8;
  if (body._meta?.connection9 !== undefined) profileUpdateData.connection9 = body._meta.connection9;
  if (body._meta?.connection10 !== undefined) profileUpdateData.connection10 = body._meta.connection10;
  if (body._meta?.connection11 !== undefined) profileUpdateData.connection11 = body._meta.connection11;
  if (body._meta?.connection12 !== undefined) profileUpdateData.connection12 = body._meta.connection12;
  
  // Custom connection methods
  if (body._meta?.custom_connection_methods !== undefined) {
    profileUpdateData.custom_connection_methods = Array.isArray(body._meta.custom_connection_methods)
      ? body._meta.custom_connection_methods.filter((m: string) => m && m.trim()).slice(0, 2)
      : [];
  }
  
  // Equipment and services
  if (body._meta?.equipment_list !== undefined) profileUpdateData.equipment_list = body._meta.equipment_list;
  if (body._meta?.services_offered !== undefined) profileUpdateData.services_offered = body._meta.services_offered;
  
  // Also support profile.* format for compatibility
  if (body.profile?.equipment_list !== undefined) profileUpdateData.equipment_list = body.profile.equipment_list;
  if (body.profile?.services_offered !== undefined) profileUpdateData.services_offered = body.profile.services_offered;
  if (body.profile?.x_url !== undefined) {
    profileUpdateData.x_url = body.profile.x_url;
    profileUpdateData.twitter_url = body.profile.x_url; // Keep legacy column in sync
  }
  
  return profileUpdateData;
}
