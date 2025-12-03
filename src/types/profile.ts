/**
 * Profile-related TypeScript interfaces
 * Replaces 'any' types throughout the application
 */

export interface User {
  id: string;
  display_name: string;
  username: string;
  email: string;
  avatar_url?: string;
  role: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface UserProfile {
  id?: string;
  user_id?: string;
  about?: string;
  short_about?: string;
  phone?: string;
  location?: string;
  studio_name?: string;
  rate_tier_1?: string | number | null;
  rate_tier_2?: string | number | null;
  rate_tier_3?: string | number | null;
  show_rates?: boolean;
  facebook_url?: string;
  twitter_url?: string;
  x_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  vimeo_url?: string;
  soundcloud_url?: string;
  tiktok_url?: string;
  threads_url?: string;
  connection1?: string;
  connection2?: string;
  connection3?: string;
  connection4?: string;
  connection5?: string;
  connection6?: string;
  connection7?: string;
  connection8?: string;
  equipment_list?: string;
  services_offered?: string;
  is_featured?: boolean;
  is_crb_checked?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface StudioImage {
  id: string;
  studio_id: string;
  image_url: string;
  cloudinary_public_id?: string;
  alt_text?: string;
  display_order: number;
  created_at?: Date | string;
}

export interface StudioType {
  id: string;
  name: string;
  description?: string;
}

export interface Studio {
  id: string;
  name: string;
  user_id: string;
  description?: string;
  website_url?: string;
  full_address?: string;
  city?: string;
  postcode?: string;
  latitude?: number | null;
  longitude?: number | null;
  studio_type?: string;
  status: string;
  is_premium: boolean;
  is_profile_visible?: boolean;
  images?: StudioImage[];
  studio_images?: StudioImage[];
  studio_types?: StudioType[];
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ProfileData {
  user: User;
  profile: UserProfile;
  studio?: Studio;
  studio_types?: StudioType[];
}

export interface ProfileCompletionData {
  display_name?: string;
  username?: string;
  email?: string;
  about?: string;
  short_about?: string;
  phone?: string;
  location?: string;
  studio_name?: string;
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  vimeo_url?: string;
  soundcloud_url?: string;
  connection1?: string;
  connection2?: string;
  connection3?: string;
  connection4?: string;
  connection5?: string;
  connection6?: string;
  connection7?: string;
  connection8?: string;
  rate_tier_1?: number | string | null;
  website_url?: string;
  images_count?: number;
  studio_types_count?: number;
  avatar_url?: string;
  equipment_list?: string;
  services_offered?: string;
}

